import { Routes } from '@angular/router';
import { Register } from './component/auth/register/register';
import { Login } from './component/auth/login/login';
import { Planning } from './component/planning/planning';

export const routes: Routes = [
    {path: 'register', component: Register},
    {path: 'login', component:Login},
    {path: '', redirectTo: 'login', pathMatch: 'full'},
    {path: 'planning', component: Planning}

];
