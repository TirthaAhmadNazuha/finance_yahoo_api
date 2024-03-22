import Crawler from './crawler.js';
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';

const sleep = (timeout = 600) => new Promise((r) => setTimeout(r, timeout));

const cleanSpace = (str) =>
  str.split(' ').filter((s) => s !== '').join(' ');

const createDirectories = (path) => {
  if (!existsSync(path)) return mkdir(path, { recursive: true });
};

export {
  Crawler,
  sleep,
  cleanSpace,
  createDirectories,
};
