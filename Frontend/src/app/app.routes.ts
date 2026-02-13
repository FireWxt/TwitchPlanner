import { Routes } from '@angular/router';
import { Register } from './component/auth/register/register';
import { Login } from './component/auth/login/login';
import { Planning } from './component/planning/planning';
import { Profile } from './component/profile/profile';

export const routes: Routes = [
    {path: 'register', component: Register},
    {path: 'login', component:Login},
    {path: '', redirectTo: 'login', pathMatch: 'full'},
    {path: 'planning', component: Planning},
    {path: 'profile', component: Profile}

];
