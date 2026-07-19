import test from 'node:test';
import assert from 'node:assert/strict';
import {
  episodePath,
  episodeLabel,
  extractSeriesNumber,
  isMainSeries,
  isInterview,
} from '../src/lib/episodes';

test('episodePath builds main episode URLs', () => {
  assert.equal(episodePath('ko', { series: 'main', episodeNumber: 83 }), '/ko/episodes/ep83');
  assert.equal(episodePath('en', { episodeNumber: 12 }), '/en/episodes/ep12'); // series 생략 -> main 기본값
});

test('episodePath builds interview URLs', () => {
  assert.equal(episodePath('ko', { series: 'interview', episodeNumber: 1 }), '/ko/interviews/1');
  assert.equal(episodePath('zh-Hans', { series: 'interview', episodeNumber: 9001 }), '/zh-Hans/interviews/9001');
});

test('episodeLabel formats main episodes as "EP {n}" regardless of language', () => {
  assert.equal(episodeLabel('ko', { series: 'main', episodeNumber: 83 }), 'EP 83');
  assert.equal(episodeLabel('ja', { episodeNumber: 5 }), 'EP 5');
});

test('episodeLabel formats interviews per language', () => {
  assert.equal(episodeLabel('ko', { series: 'interview', episodeNumber: 1 }), '인터뷰 1');
  assert.equal(episodeLabel('en', { series: 'interview', episodeNumber: 1 }), 'Interview 1');
  assert.equal(episodeLabel('ja', { series: 'interview', episodeNumber: 1 }), 'インタビュー 1');
  assert.equal(episodeLabel('zh-Hans', { series: 'interview', episodeNumber: 1 }), '访谈 1');
});

test('isMainSeries/isInterview treat missing series as main', () => {
  assert.equal(isMainSeries({ episodeNumber: 1 }), true);
  assert.equal(isInterview({ episodeNumber: 1 }), false);
  assert.equal(isMainSeries({ series: 'interview', episodeNumber: 1 }), false);
  assert.equal(isInterview({ series: 'interview', episodeNumber: 1 }), true);
});

test('extractSeriesNumber pulls trailing digits regardless of prefix', () => {
  assert.equal(extractSeriesNumber('ep83'), 83);
  assert.equal(extractSeriesNumber('interview1'), 1);
  assert.equal(extractSeriesNumber('1'), 1);
  assert.equal(extractSeriesNumber('9001'), 9001);
});

test('extractSeriesNumber returns null when there is no trailing number', () => {
  assert.equal(extractSeriesNumber('interview'), null);
  assert.equal(extractSeriesNumber(''), null);
});
