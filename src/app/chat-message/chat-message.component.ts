import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { NgClass, NgStyle } from '@angular/common';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [NgStyle , NgClass , CommonModule],
  templateUrl: './chat-message.component.html',
  styleUrl: './chat-message.component.css',
})
export class ChatMessageComponent implements OnChanges{
  @Input() message: any;
  @Input() isLocalParticipant: boolean;

  constructor(){
    // console.log("-->",this.isLocalParticipant)
  }
  ngOnChanges(changes: SimpleChanges): void {
     console.log("-->",changes)
  }

}
