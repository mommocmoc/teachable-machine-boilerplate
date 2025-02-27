// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import "@babel/polyfill";
import * as mobilenetModule from '@tensorflow-models/mobilenet';
import * as tf from '@tensorflow/tfjs';
import * as knnClassifier from '@tensorflow-models/knn-classifier';

// Number of classes to classify
const NUM_CLASSES = 3;
// Webcam Image size. Must be 227.
const IMAGE_SIZE = 227;
// K value for KNN
const TOPK = 10;

//Address : 수업시 수정
const WEB_ADDRESS = 'https://192.168.0.38:3000'
//const WEB_ADDRESS = test;

class Main {
  constructor() {
    // Initiate variables
    this.infoTexts = [];
    this.training = -1; // -1 when no class is being trained
    this.videoPlaying = false;
    this.outputTest = [];
    this.eventEmitted = [false, false, false];

    // Initiate deeplearn.js math and knn classifier objects
    this.bindPage();

    // SocketIO
    this.socket = io.connect()
    this.socket.on('connected', ()=>{
      console.log('Socket Connected');
    })
    this.socket.on('recieved', (id)=>{
      console.log('Event Submitted');

      this.eventEmitted[id] = false;
    })
    // Create video element that will contain the webcam image
    this.video = document.createElement('video');
    this.video.setAttribute('autoplay', '');
    this.video.setAttribute('playsinline', '');
    this.video.classList.add("container");

    //create jumbotron
    this.jumbo = document.createElement('div');
    this.jumbo.classList.add("jumbotron", "container", "row", "justify-content-center");
    // Add video element to DOM
    document.body.appendChild(this.jumbo);
    this.jumbo.appendChild(this.video);

    // Create training buttons and info texts
    for (let i = 0; i < NUM_CLASSES; i++) {
      const div = document.createElement('div');

      this.jumbo.appendChild(div);
      div.style.marginBottom = '10px';
      div.classList.add("container", "col-4", "col-4");

      // Create training button
      const button = document.createElement('button')
      button.innerText = "학습시키기 " + i;
      button.classList.add("btn", "btn-primary", "btn-block")
      div.appendChild(button);

      // Listen for mouse events when clicking the button
      button.addEventListener('mousedown', () => this.training = i);
      button.addEventListener('mouseup', () => this.training = -1);
      button.addEventListener('touchstart', () => this.training = i);
      button.addEventListener('touchend', () => this.training = -1);
      // Create info text
      const infoText = document.createElement('h5')
      infoText.innerText = " 아무 것도 학습되지 않았습니다.";
      infoText.classList.add("text-center","info")
      div.appendChild(infoText);
      this.infoTexts.push(infoText);



      // Create Output Test Text
      const test = document.createElement('span');
      test.innerText = "OUTPUT " + i;
      div.appendChild(test);
      test.style.visibility = 'hidden'
      this.outputTest.push(test);
    }
    // Reset button
    const reset = document.createElement('button')
    reset.innerText = "학습 데이터 리셋"
    this.jumbo.appendChild(reset);
    reset.addEventListener('touchstart',() => this.knn.clearAllClasses());
    reset.addEventListener('mousedown', () => this.knn.clearAllClasses());
    reset.classList.add("btn", "btn-danger", "btn-block")


    // Setup webcam
    navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      })
      .then((stream) => {
        this.video.srcObject = stream;
        this.video.width = IMAGE_SIZE;
        this.video.height = IMAGE_SIZE;

        this.video.addEventListener('playing', () => this.videoPlaying = true);
        this.video.addEventListener('paused', () => this.videoPlaying = false);
      })
  }

  async bindPage() {
    this.knn = knnClassifier.create();
    this.mobilenet = await mobilenetModule.load();

    this.start();
  }

  start() {
    if (this.timer) {
      this.stop();
    }
    this.video.play();
    this.timer = requestAnimationFrame(this.animate.bind(this));
  }

  stop() {
    this.video.pause();
    cancelAnimationFrame(this.timer);
  }

  async animate() {
    if (this.videoPlaying) {
      // Get image data from video element
      const image = tf.fromPixels(this.video);

      let logits;
      // 'conv_preds' is the logits activation of MobileNet.
      const infer = () => this.mobilenet.infer(image, 'conv_preds');

      // Train class if one of the buttons is held down
      if (this.training != -1) {
        logits = infer();

        // Add current image to classifier
        this.knn.addExample(logits, this.training)
      }

      const numClasses = this.knn.getNumClasses();
      if (numClasses > 0) {

        // If classes have been added run predict
        logits = infer();
        const res = await this.knn.predictClass(logits, TOPK);

        for (let i = 0; i < NUM_CLASSES; i++) {

          // The number of examples for each class
          const exampleCount = this.knn.getClassExampleCount();

          // Make the predicted class bold
          if (res.classIndex == i) {
            this.infoTexts[i].style.fontWeight = 'bold';
          } else {
            this.infoTexts[i].style.fontWeight = 'normal';
          }

          // Update info text
          if (exampleCount[i] > 0) {
            this.infoTexts[i].innerText = ` ${exampleCount[i]}개의 데이터를 학습함 - ${res.confidences[i] * 100}%`
          } else {
            this.infoTexts[i].innerText = " 아무 것도 학습되지 않았습니다."
          }

          //According to confidence, change the ouput.(socket.emit event)
          if (res.confidences[i] * 100 >= 90) {
            this.outputTest[i].style.visibility = 'visible';
            if(!this.eventEmitted[i]){
                setImmediate(()=>{this.socket.emit('output',{id:this.socket.id,output : i})});
                this.eventEmitted[i] = true;
            }
          } else {
            this.outputTest[i].style.visibility = 'hidden';
          }
        }
      }

      // Dispose image when done
      image.dispose();
      if (logits != null) {
        logits.dispose();
      }
    }
    this.timer = requestAnimationFrame(this.animate.bind(this));
  }
}

window.addEventListener('load', () => {
  var app = new Main();
  });
