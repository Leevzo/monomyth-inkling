/* the room's law tests: parse, plot, spans, people — run on the hard stories, not just the happy one.
   node tests/room.test.js */
'use strict';
var R = require('../squatch-room.js');
var pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; }
  else { fail++; console.log('FAIL ' + name + (extra ? ' — ' + extra : '')); }
}
function eq(a, b, name) { ok(a === b, name, JSON.stringify(a) + ' !== ' + JSON.stringify(b)); }

/* 1 · the rain test: two scenes, two speakers, a parenthetical */
var rain = [
  'FADE IN:', '',
  'INT. CABIN - NIGHT', '',
  'A fire crackles. Rain works the roof.', '',
  'SQUATCH', 'The notes come straight to the King.', '',
  'MAYA', 'Then we keep the door open.', '',
  'EXT. OLD ROAD - DAY', '',
  'They walk. The tape runs between them.', '',
  'SQUATCH', '(into the recorder)', 'Test one. The desk can hear me.', '',
  'MAYA', 'And the plot keeps every beat, in order.'
].join('\n');
var p1 = R.parse(rain);
eq(p1.scenes.length, 2, 'rain: two scenes');
eq(p1.people.join(','), 'SQUATCH,MAYA', 'rain: people in order');
eq(p1.places.join(','), 'CABIN,OLD ROAD', 'rain: places');
var pl1 = R.plotOf(rain);
eq(pl1.length, 6, 'rain: six beats');
eq(pl1[4].who, 'SQUATCH', 'rain: beat 5 is Squatch after the parenthetical');
eq(pl1[4].text, 'Test one.', 'rain: one beat, one question — the plot keeps the first');
eq(pl1[4].speech, 'Test one. The desk can hear me.', 'rain: the whole speech is kept on the beat, the parenthetical still out of it');
ok(pl1.every(function (b, i) { return b.place && b.heading; }), 'rain: every beat holds its scene');

/* 2 · the hard one: O.S., CONT'D, a transition, dual names, a montage, an action line in caps */
var hard = [
  'INT. HATCH - DUSK', '',
  'THE DOOR SLAMS SHUT BY ITSELF.', '',
  'KAIROS (O.S.)', 'Who bolted it?', '',
  'TAG (CONT\'D)', 'Not me. Not anyone here.', '',
  'JARVIS AND OKONKWO', '(together)', 'The light did it.', '',
  'CUT TO:', '',
  'EXT. THE SUMP - NIGHT', '',
  'A MONTAGE:', '',
  'KAIROS digs. TAG watches the water rise.', '',
  'TAG', 'We need the wheel before dawn.', '',
  'FADE OUT.'
].join('\n');
var p2 = R.parse(hard);
eq(p2.scenes.length, 2, 'hard: two scenes (a transition is not a scene)');
eq(p2.scenes[0].people.join(','), 'KAIROS,TAG,JARVIS AND OKONKWO', 'hard: O.S. and CONT\'D stripped, dual kept whole');
ok(p2.people.indexOf('THE DOOR SLAMS SHUT BY ITSELF') < 0, 'hard: an all-caps action line is not a cue');
var pl2 = R.plotOf(hard);
eq(pl2.length, 6, 'hard: six beats, the montage label takes no seat');
eq(pl2[0].who, '', 'hard: the slam stays action');
eq(pl2[4].text, 'KAIROS digs.', 'hard: the montage label never leaks into the action beat');
eq(pl2[5].who, 'TAG', 'hard: the last line finds its speaker after the montage');
eq(pl2[5].place, 'THE SUMP', 'hard: the beat knows its scene');

/* 3 · allocation across projects: people merge, lines keep, nothing is lost */
var shelf = R.freshShelf(1);
shelf.projects[0].script = rain;
R.remember(shelf, shelf.projects[0]);
var packed = R.packShelf(shelf);
var back = R.shelfFrom(JSON.parse(JSON.stringify(packed)));
eq(back.projects[0].script, rain, 'roundtrip: the script returns byte for byte');
eq(Object.keys(back.people).sort().join(','), 'MAYA,SQUATCH', 'allocation: both names found a shelf seat');
ok(back.people.SQUATCH.lines.length > 0, 'allocation: squatch keeps a line of his own');

/* 4 · spans: cut on the headings, join the pieces, the script returns */
var sp = R.spans(hard);
eq(sp.scenes.length, 2, 'spans: two pieces');
eq(R.joinSpans(sp), hard, 'spans: join gives the script back');
var pack2 = R.scenePack(hard, 'The Sump', sp.scenes[1].key);
eq(pack2.story.length, 2, 'guest pack: every scene keeps its heading');
ok(pack2.story[0].beat === '', 'guest pack: the shut scene keeps its words to itself');
ok(pack2.story[1].beat.length > 0, 'guest pack: the open scene gets the plot line');

/* 5 · the ear: a wrapped tape unwraps, names itself, and never invents a place */
var tape = [
  'The rain kept on through the night and into the',
  'morning. Maya said the road would flood',
  'before noon.',
  'Squatch. The notes come straight to the King.',
  'Maya. Then we keep the door open.',
  'Jarvis. Kairos. Tag.'
].join('\n');
var un = R.fromTape(tape);
ok(un.indexOf('INT. (THE TAPE)') === 0, 'tape: one scene, plainly headed');
ok(un.indexOf('CAST JARVIS, KAIROS, TAG') >= 0, 'tape: the chain of names lands as a cast line');
ok(un.split('\n').filter(function (l) { return l === 'SQUATCH'; }).length === 1, 'tape: squatch gets one cue');
ok(un.split('\n').filter(function (l) { return l === 'MAYA'; }).length === 1, 'tape: maya gets one cue');

/* 6 · the log replays: two edits through the door the page uses, the script stands back up */
var st = R.blank(1);
R.applyScript(st, rain, 2);
R.applyScript(st, hard, 3);
eq(R.replay(st.log, ''), st.script, 'replay: the log rebuilds the very script');

console.log(pass + ' kept, ' + fail + ' broken');
process.exit(fail ? 1 : 0);
