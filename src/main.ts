import './styles.css';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing #app');
app.textContent = '拼音追逃';
