/**
 * Cloudflare Pages 배포용 후처리 스크립트
 * 
 * Cloudflare Pages는 dist/ 내 node_modules 경로를 제외하므로,
 * expo export로 생성된 assets/node_modules/ 경로를 assets/_vendor/로 변경하고
 * JS 번들 내 참조도 함께 수정합니다.
 */
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const assetsDir = path.join(distDir, 'assets');
const nodeModulesDir = path.join(assetsDir, 'node_modules');
const vendorDir = path.join(assetsDir, '_vendor');

// 1. assets/node_modules → assets/_vendor 이동
if (fs.existsSync(nodeModulesDir)) {
    if (fs.existsSync(vendorDir)) {
        fs.rmSync(vendorDir, { recursive: true });
    }
    fs.renameSync(nodeModulesDir, vendorDir);
    console.log('✅ assets/node_modules → assets/_vendor 이동 완료');
} else {
    console.log('⚠️ assets/node_modules 없음, 건너뜀');
}

// 2. JS 번들 내 경로 참조 수정
const expoJsDir = path.join(distDir, '_expo', 'static', 'js', 'web');
if (fs.existsSync(expoJsDir)) {
    const jsFiles = fs.readdirSync(expoJsDir).filter(f => f.endsWith('.js'));
    for (const file of jsFiles) {
        const filePath = path.join(expoJsDir, file);
        let content = fs.readFileSync(filePath, 'utf-8');
        if (content.includes('node_modules')) {
            content = content.replace(/node_modules/g, '_vendor');
            fs.writeFileSync(filePath, content, 'utf-8');
            console.log(`✅ ${file}: node_modules → _vendor 참조 수정 완료`);
        }
    }
} else {
    console.log('⚠️ JS 번들 디렉토리 없음');
}

// 3. index.html → 404.html 복사
const indexHtml = path.join(distDir, 'index.html');
const notFoundHtml = path.join(distDir, '404.html');
if (fs.existsSync(indexHtml)) {
    fs.copyFileSync(indexHtml, notFoundHtml);
    console.log('✅ index.html → 404.html 복사 완료');
}

console.log('🎉 Cloudflare 배포 후처리 완료!');
