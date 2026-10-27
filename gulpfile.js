const fs = require('fs');
const { src, dest, watch, series, parallel } = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const concat = require('gulp-concat');
const terser = require('gulp-terser');
const browserSync = require('browser-sync').create();

const isDev = !process.argv.includes('build');

const paths = {
  html: 'src/*.html',
  scss: 'src/scss/**/*.scss',
  js: ['src/js/modules/*.js', 'src/js/main.js'],
  assets: 'src/assets/**/*',
  dist: 'docs',
};

function clean(done) {
  fs.rmSync(paths.dist, { recursive: true, force: true });
  done();
}

function html() {
  return src(paths.html).pipe(dest(paths.dist)).pipe(browserSync.stream());
}

function styles() {
  return src('src/scss/main.scss', { sourcemaps: isDev })
    .pipe(sass().on('error', sass.logError))
    .pipe(postcss([autoprefixer(), cssnano()]))
    .pipe(dest(`${paths.dist}/css`, { sourcemaps: isDev ? '.' : false }))
    .pipe(browserSync.stream());
}

function scripts() {
  return src(paths.js, { sourcemaps: isDev })
    .pipe(concat('main.js'))
    .pipe(terser())
    .pipe(dest(`${paths.dist}/js`, { sourcemaps: isDev ? '.' : false }))
    .pipe(browserSync.stream());
}

function assets() {
  return src(paths.assets, { encoding: false }).pipe(dest(`${paths.dist}/assets`));
}

// GitHub Pages: отключаем обработку Jekyll
function nojekyll(done) {
  fs.mkdirSync(paths.dist, { recursive: true });
  fs.writeFileSync(`${paths.dist}/.nojekyll`, '');
  done();
}

function serve() {
  browserSync.init({ server: paths.dist, port: 3000, open: false, notify: false, ui: false });
  watch(paths.html, html);
  watch(paths.scss, styles);
  watch(paths.js, scripts);
  watch(paths.assets, assets);
}

const build = series(clean, parallel(html, styles, scripts, assets), nojekyll);

exports.build = build;
exports.default = series(build, serve);
