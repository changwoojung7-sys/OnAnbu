module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            // import.meta를 웹 호환 코드로 변환하는 인라인 플러그인
            // Metro가 <script defer>로 번들을 로드하므로 import.meta가 지원되지 않음
            function importMetaTransformPlugin() {
                return {
                    visitor: {
                        MetaProperty(path) {
                            // import.meta → { url: '' } 로 변환
                            path.replaceWithSourceString('({ url: "" })');
                        },
                    },
                };
            },
        ],
    };
};
