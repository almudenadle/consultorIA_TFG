import { Routes } from '@angular/router';
// Imported but don´t used since it´s not neccesary yet
import { AuthGuard } from './guards/auth_guard';

import { LandingPageComponent } from './pages/landing-page/landing-page.component';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { ConsultationPageComponent } from './pages/consultation-page/consultation-page.component';
import { RegistrationPageComponent } from './pages/registration-page/registration-page.component';
import { LoginPageComponent } from './pages/login-page/login-pages.component';
import { ProfileConfigurationComponent } from './pages/profile-configuration/profile-configuration.component';

export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'home', component: HomePageComponent, canActivate: [AuthGuard] },
  { path: 'register', component: RegistrationPageComponent },
  {
    path: 'profile',
    component: ProfileConfigurationComponent,
    canActivate: [AuthGuard],
  },
  // Se Agrega :id? para indicar que es un parámetro (opcional si usas dos líneas, o esta estrategia):
  {
    path: 'consultations',
    component: ConsultationPageComponent,
    canActivate: [AuthGuard],
  }, // for new consultation
  {
    path: 'consultations/:id',
    component: ConsultationPageComponent,
    canActivate: [AuthGuard],
  }, // for existing consultation
  { path: 'login', component: LoginPageComponent },
];
