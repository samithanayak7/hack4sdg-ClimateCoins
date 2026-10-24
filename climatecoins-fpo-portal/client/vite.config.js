const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');
const path = require('path');
module.exports = defineConfig({ root: __dirname, plugins:[react()], server:{port:5173,proxy:{'/api':'http://localhost:4000'}}, build:{outDir:'dist',emptyOutDir:true}, resolve:{alias:{'@':path.resolve(__dirname,'src')}} });
