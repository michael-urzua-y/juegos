import { mount } from 'svelte'
import './app.css'
import App from './app/App.svelte'
import { bootstrap } from './app/bootstrap.svelte'

bootstrap()

export default mount(App, { target: document.getElementById('app')! })
