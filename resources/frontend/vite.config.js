import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// Custom plugin to add the nomin comment
// This ensures that the SmartComments library is not minified by MediaWiki,
// which caused issues with the library.
const addNominComment = () => {
    return {
        name: 'add-nomin-comment',
        generateBundle(options, bundle) {
            Object.values(bundle).forEach((file) => {
                if (file.fileName === 'smartcomments.min.js') {
                    file.code = '/*@nomin*/\n' + file.code;
                }
            });
        }
    };
};

export default defineConfig(({ command }) => ({
    plugins: [
        vue(),
        addNominComment()
    ],
    define: {
        'process.env': {},
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
        emptyOutDir: true,
        lib: {
            entry: resolve(__dirname, 'src/App.js'),
            formats: ['iife'],
            name: 'SmartComments',
            fileName: () => 'smartcomments.min.js'
        },
        minify: command === 'serve' ? false : 'terser',
        watch: command === 'serve' ? {} : null,
        rollupOptions: {
            output: {
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name.endsWith('.css')) {
                        return 'smartcomments.min.css';
                    }
                    return 'assets/[name]-[hash][extname]';
                },
                intro: '/*@nomin*/',
            }
        }
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        }
    }
})) 