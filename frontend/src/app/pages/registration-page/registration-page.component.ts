import { Component } from '@angular/core';
import { RegistrationFormComponent } from '../../components/registration-form/registration-form.component';

@Component({
  selector: 'app-registration-page',
  standalone: true,
  imports: [RegistrationFormComponent],
  templateUrl: './registration-page.component.html',
  styleUrl: './registration-page.component.scss'
})
export class RegistrationPageComponent {

}
