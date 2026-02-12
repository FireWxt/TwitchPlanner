import { Routes } from '@angular/router';
import { Register } from './component/auth/register/register';
import { Login } from './component/auth/login/login';

export const routes: Routes = [
    {path: 'register', component: Register},
    {path: 'login', component:Login}

];
