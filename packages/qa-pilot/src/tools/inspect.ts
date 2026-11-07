import { midsceneBridge } from '../engine/midsceneBridge.js';

export async function handleInspect() {
  const result = await midsceneBridge.inspect();

  return {
    content: [
      {
        type: 'text',
        text: result.summary
      }
    ]
  };
}

