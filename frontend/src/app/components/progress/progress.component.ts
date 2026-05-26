import { Component } from '@angular/core';
import { Input } from '@angular/core';

@Component({
  selector: 'app-progress',
  imports: [],
  templateUrl: './progress.component.html',
  styleUrl: './progress.component.scss'
})
export class ProgressComponent {
  @Input() progress: number = 50;
}
