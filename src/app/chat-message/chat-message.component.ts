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
export class ChatMessageComponent {
  @Input() message: any;
  @Input() isLocalParticipant: boolean;

  constructor(){}

}
