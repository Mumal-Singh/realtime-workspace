import { Request, Response } from 'express';
import * as authService from './auth.service';

export async function signupHandler(req: Request, res: Response) {
  const { email, password, name } = req.body;
  const tokens = await authService.signup(email, password, name);
  res.status(201).json(tokens);
}

export async function loginHandler(req: Request, res: Response) {
  const { email, password } = req.body;
  const tokens = await authService.login(email, password);
  res.json(tokens);
}

export async function refreshHandler(req: Request, res: Response) {
  const { refreshToken } = req.body;
  const tokens = await authService.refresh(refreshToken);
  res.json(tokens);
}

export async function logoutHandler(req: Request, res: Response) {
  const { refreshToken } = req.body;
  await authService.logout(refreshToken);
  res.status(204).send();
}
