/*
*  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
*
*  Use of this source code is governed by a BSD-style license
*  that can be found in the LICENSE file in the root of the source
*  tree.
*/

"use strict";

/* globals main, MediaRecorder */

const mediaSource = new MediaSource();
mediaSource.addEventListener("sourceopen", handleSourceOpen, false);
let mediaRecorder;
let recordedBlobs;
let sourceBuffer;

const canvas = document.querySelector("canvas");
const video = document.createElement("video");

// Start the GL teapot on the canvas

const stream = canvas.captureStream(); // frames per second
console.log("Started stream capture from canvas element: ", stream);

function handleSourceOpen(event) {
  console.log("MediaSource opened");
  sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="h264"');
  console.log("Source buffer: ", sourceBuffer);
}

function handleDataAvailable(event) {
  if (event.data && event.data.size > 0) {
    recordedBlobs.push(event.data);
  }
}

function handleStop(event) {
  console.log("Recorder stopped: ", event);
  const superBuffer = new Blob(recordedBlobs, {
    type: "video/webm;codecs=h264"
  });
  video.src = window.URL.createObjectURL(superBuffer);
}

// The nested try blocks will be simplified when Chrome 47 moves to Stable
function startRecording() {
  let options = {
    videoBitsPerSecond: 20000000,
    mimeType: "video/webm"
  };
  recordedBlobs = [];
  try {
    mediaRecorder = new MediaRecorder(stream, options);
  } catch (e0) {
    console.log("Unable to create MediaRecorder with options Object: ", e0);
    try {
      options = { mimeType: "video/webm,codecs=vp9" };
      mediaRecorder = new MediaRecorder(stream, options);
    } catch (e1) {
      console.log("Unable to create MediaRecorder with options Object: ", e1);
      try {
        options = "video/vp8"; // Chrome 47
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e2) {
        alert(
          "MediaRecorder is not supported by this browser.\n\n" +
            "Try Firefox 29 or later, or Chrome 47 or later, " +
            "with Enable experimental Web Platform features enabled from chrome://flags."
        );
        console.error("Exception while creating MediaRecorder:", e2);
        return;
      }
    }
  }
  console.log("Created MediaRecorder", mediaRecorder, "with options", options);
  mediaRecorder.onstop = handleStop;
  console.log(mediaRecorder.videoBitsPerSecond);
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.start(100); // collect 100ms of data
  console.log("MediaRecorder started", mediaRecorder);
}

function stopRecording() {
  mediaRecorder.stop();
  console.log("Recorded Blobs: ", recordedBlobs);
  video.controls = true;
}

function download() {
  const blob = new Blob(recordedBlobs, { type: "video/webm" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = "export.webm";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
}

export { startRecording, stopRecording, download };
