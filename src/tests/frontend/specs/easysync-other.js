'use strict';

const Changeset = require('../../../static/js/Changeset');
const AttributePool = require('../../../static/js/AttributePool');
const {randomMultiline, poolOrArray} = require('./easysync-helper.js');

describe('easysync', function () {
  describe('filter attribute numbers', function () {
    const testFilterAttribNumbers = (testId, cs, filter, correctOutput) => {
      it(`testFilterAttribNumbers#${testId}`, async function () {
        const str = Changeset.filterAttribNumbers(cs, filter);
        expect(str).to.equal(correctOutput);
      });
    };

    testFilterAttribNumbers(1, '*0*1+1+2+3*1+4*2+5*0*2*1*b*c+6',
        (n) => (n % 2) === 0, '*0+1+2+3+4*2+5*0*2*c+6');
    testFilterAttribNumbers(2, '*0*1+1+2+3*1+4*2+5*0*2*1*b*c+6',
        (n) => (n % 2) === 1, '*1+1+2+3*1+4+5*1*b+6');
  });
  describe('make attribs string', function () {
    const testMakeAttribsString = (testId, pool, opcode, attribs, correctString) => {
      it(`testMakeAttribsString#${testId}`, async function () {
        const p = poolOrArray(pool);
        const str = Changeset.makeAttribsString(opcode, attribs, p);
        expect(str).to.equal(correctString);
      });
    };

    testMakeAttribsString(1, ['bold,'], '+', [
      ['bold', ''],
    ], '');
    testMakeAttribsString(2, ['abc,def', 'bold,'], '=', [
      ['bold', ''],
    ], '*1');
    testMakeAttribsString(3, ['abc,def', 'bold,true'], '+', [
      ['abc', 'def'],
      ['bold', 'true'],
    ], '*0*1');
    testMakeAttribsString(4, ['abc,def', 'bold,true'], '+', [
      ['bold', 'true'],
      ['abc', 'def'],
    ], '*0*1');
  });

  describe('other', function () {
    it('testMoveOpsToNewPool', async function () {
      const pool1 = new AttributePool();
      const pool2 = new AttributePool();

      pool1.putAttrib(['baz', 'qux']);
      pool1.putAttrib(['foo', 'bar']);

      pool2.putAttrib(['foo', 'bar']);

      expect(Changeset.moveOpsToNewPool('Z:1>2*1+1*0+1$ab', pool1, pool2))
          .to.equal('Z:1>2*0+1*1+1$ab');
      expect(Changeset.moveOpsToNewPool('*1+1*0+1', pool1, pool2)).to.equal('*0+1*1+1');
    });

    it('testMakeSplice', async function () {
      const t = 'a\nb\nc\n';
      const t2 = Changeset.applyToText(Changeset.makeSplice(t, 5, 0, 'def'), t);
      expect(t2).to.equal('a\nb\ncdef\n');
    });

    it('testToSplices', async function () {
      const cs = Changeset.checkRep('Z:z>9*0=1=4-3+9=1|1-4-4+1*0+a$123456789abcdefghijk');
      const correctSplices = [
        [5, 8, '123456789'],
        [9, 17, 'abcdefghijk'],
      ];
      expect(Changeset.toSplices(cs)).to.eql(correctSplices);
    });

    it('opAttributeValue', async function () {
      const p = new AttributePool();
      p.putAttrib(['name', 'david']);
      p.putAttrib(['color', 'green']);

      const stringOp = (str) => Changeset.opIterator(str).next();

      expect(Changeset.opAttributeValue(stringOp('*0*1+1'), 'name', p)).to.equal('david');
      expect(Changeset.opAttributeValue(stringOp('*0+1'), 'name', p)).to.equal('david');
      expect(Changeset.opAttributeValue(stringOp('*1+1'), 'name', p)).to.equal('');
      expect(Changeset.opAttributeValue(stringOp('+1'), 'name', p)).to.equal('');
      expect(Changeset.opAttributeValue(stringOp('*0*1+1'), 'color', p)).to.equal('green');
      expect(Changeset.opAttributeValue(stringOp('*1+1'), 'color', p)).to.equal('green');
      expect(Changeset.opAttributeValue(stringOp('*0+1'), 'color', p)).to.equal('');
      expect(Changeset.opAttributeValue(stringOp('+1'), 'color', p)).to.equal('');
    });

    describe('applyToAttribution', function () {
      const runApplyToAttributionTest = (testId, attribs, cs, inAttr, outCorrect) => {
        it(`applyToAttribution#${testId}`, async function () {
          const p = poolOrArray(attribs);
          const result = Changeset.applyToAttribution(Changeset.checkRep(cs), inAttr, p);
          expect(result).to.equal(outCorrect);
        });
      };

      // turn c<b>a</b>ctus\n into a<b>c</b>tusabcd\n
      runApplyToAttributionTest(1,
          ['bold,', 'bold,true'], 'Z:7>3-1*0=1*1=1=3+4$abcd', '+1*1+1|1+5', '+1*1+1|1+8');

      // turn "david\ngreenspan\n" into "<b>david\ngreen</b>\n"
      runApplyToAttributionTest(2,
          ['bold,', 'bold,true'], 'Z:g<4*1|1=6*1=5-4$', '|2+g', '*1|1+6*1+5|1+1');
    });
    describe('split/join attribution lines', function () {
      const testSplitJoinAttributionLines = (randomSeed) => {
        const stringToOps = (str) => {
          const assem = Changeset.mergingOpAssembler();
          const o = Changeset.newOp('+');
          o.chars = 1;
          for (let i = 0; i < str.length; i++) {
            const c = str.charAt(i);
            o.lines = (c === '\n' ? 1 : 0);
            o.attribs = (c === 'a' || c === 'b' ? `*${c}` : '');
            assem.append(o);
          }
          return assem.toString();
        };

        it(`testSplitJoinAttributionLines#${randomSeed}`, async function () {
          const doc = `${randomMultiline(10, 20)}\n`;

          const theJoined = stringToOps(doc);
          const theSplit = doc.match(/[^\n]*\n/g).map(stringToOps);

          expect(Changeset.splitAttributionLines(theJoined, doc)).to.eql(theSplit);
          expect(Changeset.joinAttributionLines(theSplit)).to.equal(theJoined);
        });
      };

      for (let i = 0; i < 10; i++) testSplitJoinAttributionLines(i);
    });
  });
});
