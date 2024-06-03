import {
  Component,
  ComponentFactoryResolver,
  ElementRef,
  ViewChild,
  ViewContainerRef,
} from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { VideoSDK } from "@videosdk.live/js-sdk";
import { NgClass } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { NotifierService } from "./services/notifier.service";
import { ChatMessageComponent } from "./chat-message/chat-message.component";
import { ParticipantsComponent } from "./participants/participants.component";
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  Validators,
} from "@angular/forms";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    RouterOutlet,
    NgClass,
    FormsModule,
    ChatMessageComponent,
    ParticipantsComponent,
    ReactiveFormsModule,
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
  isDetailSectionHidden: boolean = false;
  micEnabled: boolean = false;
  camEnabled: boolean = false;
  participants: any[] = [];
  name: string = "";
  webcamStream: MediaStream | null = null;
  isChatVisible: boolean = false;
  sendTextMessage: string = "";
  chatEventListener: Function | undefined;
  alertString: string;
  meetingId: string;
  isParticipantsVisible: boolean = false;
  form: FormGroup;

  constructor(
    private toasterService: NotifierService,
    private componentFactoryResolver: ComponentFactoryResolver,
    private formBuilder: FormBuilder
  ) {
    this.raiseHand = this.raiseHand.bind(this);
  }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      name: ["", Validators.required],
      meetingId: ["", [Validators.required]],
    });
  }

  async initMeeting() {
    const { name, meetingId } = this.form.value;
    VideoSDK.config(
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGlrZXkiOiIwMThlMWQ4Mi03N2Y5LTQ0MGEtOGNhMC0xNWY0YTcyNzAxNjkiLCJwZXJtaXNzaW9ucyI6WyJhbGxvd19qb2luIl0sImlhdCI6MTcxNTIzODI0MywiZXhwIjoxODczMDI2MjQzfQ.QbFoCROXzWUN44ZKa-iuNT91f0Tcnxc9ih8wDZnruLA"
    );

    this.meeting = VideoSDK.initMeeting({
      meetingId: meetingId,
      name: name,
      micEnabled: this.micEnabled,
      webcamEnabled: this.isCamera,
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
    } else {
      // Enable webcam
      this.isCamera = true;
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((mediaStream) => {
          this.localVideo.nativeElement.srcObject = mediaStream;
          this.webcamStream = mediaStream;
          this.camEnabled = true;
        })
        .catch((error) => {
          this.isCamera = false;
          console.log("error", error);
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
        let { senderId } = data;
        const componentFactory =
          this.componentFactoryResolver.resolveComponentFactory(
            ChatMessageComponent
          );

        const componentRef =
          this.chatContainer.createComponent(componentFactory);
        componentRef.instance.message = data;
        componentRef.instance.isLocalParticipant =
          this.meeting.localParticipant.id == senderId;
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

      this.chatContainer.clear();

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
      this.participants[result].audioStream = mediaStream;
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
      this.participants[result].mediaStream = mediaStream;
    } else {
      participant.mediaStream = mediaStream;
      this.participants.push(participant);
    }
  }

  join() {
    if (this.form.valid) {
      this.initMeeting();
      this.isDetailSectionHidden = true;
      this.webcamStream
        ? this.meeting.join({ localStream: this.webcamStream })
        : this.meeting.join();
    } else {
      this.isDetailSectionHidden = false;
    }
  }

  leave() {
    this.meeting.leave();
    this.meeting = null;
    this.camEnabled = false;
    this.isCamera = false;
    this.isChatVisible = false;
    this.isParticipantsVisible = false;
    this.localVideo.nativeElement.srcObject = null;
    this.webcamStream = null;
    this.participants = this.participants.filter(
      (obj) => obj.id !== this.meeting.localParticipant.id
    );
    this.isDetailSectionHidden = false;
    this.toasterService.clear();
  }

  enableMic() {
    if (this.meeting) {
      this.meeting.unmuteMic();
    }
    this.micEnabled = true;
  }

  disableMic() {
    if (this.meeting) {
      this.meeting.muteMic();
    }
    this.micEnabled = false;
  }

  enableCam() {
    this.meeting.enableWebcam();
    this.camEnabled = true;
    this.isCamera = true;
  }

  disableCam() {
    this.meeting.disableWebcam();
    this.camEnabled = false;
    this.isCamera = false;
  }
  chat() {
    this.isParticipantsVisible = false;
    this.isChatVisible = !this.isChatVisible;
  }

  async raise() {
    await this.meeting?.pubSub.publish("RAISE_HAND", "Raise Hand");
  }

  showParticipants() {
    this.isChatVisible = false;
    this.isParticipantsVisible = !this.isParticipantsVisible;
  }

  raiseHand(data: any) {
    this.alertString = `${data.senderName} raise hand`;
    this.toasterService.success(this.alertString);
  }

  async sendMessage() {
    const message = this.sendTextMessage;
    this.sendTextMessage = "";
    await this.meeting.pubSub.publish("CHAT", message, { persist: true });
  }
}
