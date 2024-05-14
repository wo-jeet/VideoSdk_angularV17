import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { VideoSDK } from '@videosdk.live/js-sdk';
import { environment } from '../environment/environment';
import { MatIconModule } from '@angular/material/icon';
import { NgClass } from '@angular/common';
import { FormsModule, NgModel } from '@angular/forms';
import e from 'express';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MatIconModule, NgClass, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  @ViewChild('localVideo') localVideo: ElementRef;
  @ViewChild('remoteVideo') remoteVideo: ElementRef;
  @ViewChild('remoteAudio') remoteAudio: ElementRef;
  title = 'videosdkDemo';
  meeting: any;
  isHidden: boolean = false;
  micEnabled: boolean = false;
  camEnabled: boolean = false;
  participants: any[] = [];
  name: string = '';
  webcamStream: MediaStream | null = null;
  micStream: MediaStream | null = null;



  constructor(private cdr: ChangeDetectorRef) {}


  

  async initMeeting() {

    VideoSDK.config(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlrZXkiOiIwMThlMWQ4Mi03N2Y5LTQ0MGEtOGNhMC0xNWY0YTcyNzAxNjkiLCJwZXJtaXNzaW9ucyI6WyJhbGxvd19qb2luIl0sImlhdCI6MTcxNTIzODI0MywiZXhwIjoxODczMDI2MjQzfQ.QbFoCROXzWUN44ZKa-iuNT91f0Tcnxc9ih8wDZnruLA'
    );

    this.meeting = VideoSDK.initMeeting({
      meetingId: environment.videosdk.meetingId,
      name: this.name,
      micEnabled: false,
      webcamEnabled: false,
      maxResolution: 'hd',
    });

    this.registerParticipantEvents();
  }
  join() {
    console.log('getting joining event ', this.meeting);
    this.isHidden = true;
    
    if (this.webcamStream) {
      this.meeting.join({ localStream: this.webcamStream });
    }else{
      this.meeting.join();
    }
  }

  leave() {
    console.log('leave', this.meeting.localParticipant.id);
    this.meeting.leave();
    this.participants = this.participants.filter(
      (obj) => obj.id !== this.meeting.localParticipant.id
    );
    console.log("after leaving",this.participants)
    this.isHidden = false;

  }

  toggleWebcam() {
    if (this.webcamStream) {
      // Disable webcam
      this.webcamStream.getTracks().forEach(track => track.stop());
      this.localVideo.nativeElement.srcObject = null;
      this.webcamStream = null;
      this.camEnabled = false;
      this.meeting.disableWebcam();

    } else {
      // Enable webcam
      navigator.mediaDevices.getUserMedia({ video: true}).then(mediaStream => {
        this.localVideo.nativeElement.srcObject = mediaStream;
        this.webcamStream = mediaStream;
        this.camEnabled = true;
        this.meeting.enableWebcam();

      }).catch(error => {
        console.error('Error accessing camera and microphone:', error);
      });
    }
  }

  registerParticipantEvents() {
    this.meeting.on('meeting-joined', () => {
      console.log('meeting', this.meeting);
      this.participants.push(this.meeting.localParticipant);
      this.meeting.localParticipant.on('stream-enabled', (stream: any) => {
        if (stream.kind == 'video')
          this.createVideoElement(
            stream,
            this.meeting.localParticipant,
            this.localVideo
          );
      });
      this.cdr.detectChanges()
    });

    this.meeting.on('participant-joined', (participant: any) => {
      this.participants.push(participant);
      participant.on('stream-enabled', (stream: any) => {
        if (stream.kind == 'audio')
          this.createAudioElement(stream, participant, this.remoteAudio);
        if (stream.kind == 'video')
          this.createVideoElement(stream, participant, this.remoteVideo);
      });
      this.cdr.detectChanges()

    });

    this.meeting.on('participant-left', (participant: any)=>{
      this.participants = this.participants.filter(
        (obj) => obj.id !== participant.id
      );
    })

    this.meeting.on('error', (data) => {
      const { code, message } = data;
      console.log('ERROR', code, message);
    });
  }

  createAudioElement(stream: any, participant: any, remoteAudio: ElementRef) {
    if (participant.id == this.meeting.localParticipant.id) return;
    const mediaStream = new MediaStream();
    mediaStream.addTrack(stream.track);
    this;
    const result = this.participants.findIndex(
      (obj) => obj.id === participant.id
    );
    if (result >= 0) {
      const element = this.participants[result];
      element.audioStream = mediaStream;
      this.participants[result] = element;
    } else {
      participant.audioStream = mediaStream;
      this.participants.push(participant);
    }
  }

  createVideoElement(stream: any, participant: any, remoteVideo: ElementRef) {
    console.log('stream', stream);
    const mediaStream = new MediaStream();
    mediaStream.addTrack(stream.track);
    const result = this.participants.findIndex(
      (obj) => obj.id === participant.id
    );

    if (result >= 0) {
      const element = this.participants[result];
      element.mediaStream = mediaStream;
      this.participants[result] = element;
    } else {
      participant.mediaStream = mediaStream;
      this.participants.push(participant);
    }
    console.log('participants', this.participants);
  }

  ngOnInit() {
    this.initMeeting(); 
  }

  onchangeName(){
    this.initMeeting()
  }

  enableMic() {
    this.meeting.unmuteMic();
    this.micEnabled = true;
    console.log("enable", this.meeting)
  }

  disableMic() {
    this.meeting.muteMic();
    this.micEnabled = false;
    console.log("disable")

  }

  enableCam() {
    this.meeting.enableWebcam();
    this.camEnabled = true;
  }

  disableCam() {
    this.meeting.disableWebcam();
    this.camEnabled = false;
  }
}
