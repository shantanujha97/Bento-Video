import React from 'react';
import { createRoot } from 'react-dom/client';
import Silk from './Silk/Silk.jsx';
import SoftAurora from './SoftAurora/SoftAurora.jsx';
import Grainient from './Grainient/Grainient.jsx';
import LightRays from './LightRays/LightRays.jsx';
import Aurora from './Aurora/Aurora.jsx';
const C = { Silk, SoftAurora, Grainient, LightRays, Aurora };
window.mountBg = (el, name, props) => new Promise(res => { const root = createRoot(el); root.render(React.createElement(C[name], props)); setTimeout(res, 50); });
