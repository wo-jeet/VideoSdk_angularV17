import {
  Component,
  ComponentFactoryResolver,
  ElementRef,
  ViewChild,
  ViewContainerRef,
} from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { VideoSDK } from "@videosdk.live/js-sdk";
import { environment } from "../environment/environment";
import { MatIconModule } from "@angular/material/icon";
import { NgClass } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { NotifierService } from "./services/notifier.service";
import { ChatMessageComponent } from "./chat-message/chat-message.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    RouterOutlet,
    MatIconModule,
    NgClass,
    FormsModule,
    ChatMessageComponent,
  ],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
})
export class AppComponent {
  @ViewChild("localVideo") localVideo: ElementRef;
  @ViewChild("remoteVideo") remoteVideo: ElementRef;
  @ViewChild("remoteAudio") remoteAudio: ElementRef;
  @ViewChild("chatContainer", { read: ViewContainerRef })
  chatContainer: ViewContainerRef;


  title = "videosdkDemo";
  meeting: any;
  isCamera: boolean = false;
  isHidden: boolean = false;
  micEnabled: boolean = false;
  camEnabled: boolean = false;
  participants: any[] = [];
  name: string = "";
  webcamStream: MediaStream | null = null;
  isChatVisible: boolean = true;
  sendTextMessage: string = "";
  chatEventListener: Function | undefined;
  alertString: string;

  constructor(
    private toasterService: NotifierService,
    private componentFactoryResolver: ComponentFactoryResolver
  ) {
    this.raiseHand = this.raiseHand.bind(this);
  }

  async initMeeting() {
    VideoSDK.config(
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlrZXkiOiIwMThlMWQ4Mi03N2Y5LTQ0MGEtOGNhMC0xNWY0YTcyNzAxNjkiLCJwZXJtaXNzaW9ucyI6WyJhbGxvd19qb2luIl0sImlhdCI6MTcxNTIzODI0MywiZXhwIjoxODczMDI2MjQzfQ.QbFoCROXzWUN44ZKa-iuNT91f0Tcnxc9ih8wDZnruLA"
    );

    this.meeting = VideoSDK.initMeeting({
      meetingId: environment.videosdk.meetingId,
      name: this.name,
      micEnabled: false,
      webcamEnabled: false,
      maxResolution: "hd",
    });

    this.registerParticipantEvents();
  }

  toggleWebcam() {
    if (this.webcamStream) {
      // Disable webcam
      this.isCamera = false;
      this.webcamStream.getTracks().forEach((track) => track.stop());
      this.localVideo.nativeElement.srcObject = null;
      this.webcamStream = null;
      this.camEnabled = false;
      this.meeting.disableWebcam();
    } else {
      // Enable webcam
      this.isCamera = true;
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((mediaStream) => {
          this.localVideo.nativeElement.srcObject = mediaStream;
          this.webcamStream = mediaStream;
          this.camEnabled = true;
          this.meeting.enableWebcam();
        })
        .catch((error) => {
          console.log("error",error)
          console.error("Error accessing camera and microphone:", error);
        });
    }
  }

  registerParticipantEvents() {
    this.meeting.on("meeting-joined", async () => {
      this.participants.push(this.meeting.localParticipant);
      this.meeting.localParticipant.on("stream-enabled", (stream: any) => {
        if (stream.kind == "video")
          this.createVideoElement(
            stream,
            this.meeting.localParticipant,
            this.localVideo
          );
      });

      this.chatEventListener = async (data: any) => {
        let {senderId} = data;
        const componentFactory =
          this.componentFactoryResolver.resolveComponentFactory(
            ChatMessageComponent
          );

        const componentRef = this.chatContainer.createComponent(componentFactory);
        componentRef.instance.message = data;
        componentRef.instance.isLocalParticipant = this.meeting.localParticipant.id == senderId
    
      };
      await this.meeting.pubSub.subscribe("CHAT", this.chatEventListener);
      await this.meeting?.pubSub?.subscribe("RAISE_HAND", this.raiseHand);
    });

    this.meeting.on("participant-joined", (participant: any) => {
      this.participants.push(participant);
      participant.on("stream-enabled", (stream: any) => {
        if (stream.kind == "audio")
          this.createAudioElement(stream, participant, this.remoteAudio);
        if (stream.kind == "video")
          this.createVideoElement(stream, participant, this.remoteVideo);
      });
    });

    this.meeting.on("participant-left", (participant: any) => {
      this.participants = this.participants.filter(
        (obj) => obj.id !== participant.id
      );
    });

    this.meeting.on("meeting-left", async () => {
      this.participants = [];

      this.chatContainer.clear()

      if (this.chatEventListener) {
        this.meeting.pubSub.unsubscribe("CHAT", this.chatEventListener);
        this.chatEventListener = undefined;
      }

      await this.meeting?.pubSub?.unsubscribe("RAISE_HAND", this.raiseHand);
    });

    this.meeting.on("error", (data) => {
      const { code, message } = data;
      console.log("ERROR", code, message);
    });
  }

  createAudioElement(stream: any, participant: any, remoteAudio: ElementRef) {
    if (participant.id == this.meeting.localParticipant.id) return;
    const mediaStream = new MediaStream();
    mediaStream.addTrack(stream.track);
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
  }

  ngOnInit() {
    this.initMeeting();
  }

  onchangeName() {
    this.initMeeting();
  }

  join() {
    this.isHidden = true;
    this.webcamStream ? this.meeting.join({ localStream: this.webcamStream }) : this.meeting.join();
  }

  leave() {
    this.meeting.leave();
    this.participants = this.participants.filter(
      (obj) => obj.id !== this.meeting.localParticipant.id
    );
    this.isHidden = false;
  }

  enableMic() {
    this.meeting.unmuteMic();
    this.micEnabled = true;
  }

  disableMic() {
    this.meeting.muteMic();
    this.micEnabled = false;
  }

  enableCam() {
    this.meeting.enableWebcam();
    this.camEnabled = true;
  }

  disableCam() {
    this.meeting.disableWebcam();
    this.camEnabled = false;
  }
  chat() {
    this.isChatVisible = !this.isChatVisible;
  }

  async raise() {
    await this.meeting?.pubSub.publish("RAISE_HAND", "Raise Hand");
  }

  raiseHand(data: any) {
    this.alertString = `${data.senderName} raise hand`;
    this.toasterService.success(this.alertString);
  }

  async sendMessage() {
    const message = this.sendTextMessage;
    this.sendTextMessage = "";
    this.meeting.pubSub
      .publish("CHAT", message, { persist: true })
      .then((res: any) => console.log(`response of publish : ${res}`))
      .catch((err: any) => console.log(`error of publish : ${err}`));
  }
}
