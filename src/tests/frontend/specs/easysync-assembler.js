'use strict';

const Changeset = require('../../../static/js/Changeset');
const {poolOrArray} = require('./easysync-helper.js');

describe('easysync', function () {
  it('opAssembler', async function () {
    const x = '-c*3*4+6|3=az*asdf0*1*2*3+1=1-1+1*0+1=1-1+1|c=c-1';
    const iter = Changeset.opIterator(x);
    const assem = Changeset.opAssembler();
    while (iter.hasNext()) assem.append(iter.next());
    expect(assem.toString()).to.equal(x);
  });

  it('smartOpAssembler', async function () {
    const x = '-c*3*4+6|3=az*asdf0*1*2*3+1=1-1+1*0+1=1-1+1|c=c-1';
    const iter = Changeset.opIterator(x);
    const assem = Changeset.smartOpAssembler();
    while (iter.hasNext()) assem.append(iter.next());
    assem.endDocument();
    expect(assem.toString()).to.equal(x);
  });

  describe('append atext to assembler', function () {
    const testAppendATextToAssembler = (testId, atext, correctOps) => {
      it(`testAppendATextToAssembler#${testId}`, async function () {
        const assem = Changeset.smartOpAssembler();
        Changeset.appendATextToAssembler(atext, assem);
        expect(assem.toString()).to.equal(correctOps);
      });
    };

    testAppendATextToAssembler(1, {
      text: '\n',
      attribs: '|1+1',
    }, '');
    testAppendATextToAssembler(2, {
      text: '\n\n',
      attribs: '|2+2',
    }, '|1+1');
    testAppendATextToAssembler(3, {
      text: '\n\n',
      attribs: '*x|2+2',
    }, '*x|1+1');
    testAppendATextToAssembler(4, {
      text: '\n\n',
      attribs: '*x|1+1|1+1',
    }, '*x|1+1');
    testAppendATextToAssembler(5, {
      text: 'foo\n',
      attribs: '|1+4',
    }, '+3');
    testAppendATextToAssembler(6, {
      text: '\nfoo\n',
      attribs: '|2+5',
    }, '|1+1+3');
    testAppendATextToAssembler(7, {
      text: '\nfoo\n',
      attribs: '*x|2+5',
    }, '*x|1+1*x+3');
    testAppendATextToAssembler(8, {
      text: '\n\n\nfoo\n',
      attribs: '|2+2*x|2+5',
    }, '|2+2*x|1+1*x+3'); //TODO: why isn't this |2+2*x|1+4 ?
  });
});
