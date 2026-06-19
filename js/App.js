// App.js
const { useState } = React;
import { Home } from './components/Home.js';
import { Editor } from './components/Editor.js';
import './effects/index.js'; // 全エフェクトを登録

export function App() {
  const [route, setRoute] = useState({ name: 'home' });

  if (route.name === 'editor') {
    return <Editor projectId={route.projectId} onBackHome={() => setRoute({ name: 'home' })} />;
  }
  return <Home onOpenProject={(id) => setRoute({ name: 'editor', projectId: id })} />;
}
