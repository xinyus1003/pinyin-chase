import './styles.css';
import { bootstrap } from './app';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing #app');
bootstrap(app);
