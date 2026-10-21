import { Component } from '@angular/core';
import { ConcertList } from './components/concert-list/concert-list';

@Component({
  imports: [ConcertList],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {}
