import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-participants',
  standalone: true,
  imports: [],
  templateUrl: './participants.component.html',
  styleUrl: './participants.component.css'
})
export class ParticipantsComponent {
 @Input() participants: any
}
