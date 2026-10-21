import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { Concert } from '../../models/concert';

@Component({
  imports: [DatePipe],
  selector: 'app-concert-card',
  styleUrl: './concert-card.css',
  templateUrl: './concert-card.html',
})
export class ConcertCard {
  // The card "receives" a concert from its parent: <app-concert-card [concert]="..." />
  // input() is a signal, so in the HTML we read it as concert().
  readonly concert = input.required<Concert>();
}
