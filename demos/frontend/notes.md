# Frontend part notes

- App was created using cmds:
```
npm create vite@latest my-app -- --template react-ts // Choosing React, and then Typescript
cd my-app
npm install
npm run dev
```
- Mol was then installed using `npm install molstar`.

- Kvôli importu som dostal chybu
```
[vite] (client) Pre-transform error: Preprocessor dependency "sass-embedded" not found. Did you install it? Try `npm install -D sass-embedded`.
Plugin: vite:css
File: C:/Users/milan/Desktop/prankweb/demos/frontend/my-app/node_modules/molstar/lib/mol-plugin-ui/skin/light.scss
```

Preto som použil `npm install -D sass-embedded`.
