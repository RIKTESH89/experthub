// Own implementation of the MT19937 recurrence. Seeds match the approved art.
export class MersenneTwister {
  constructor(seed) {
    this.words = new Uint32Array(624);
    this.words[0] = seed >>> 0;
    for (let i = 1; i < 624; i++) this.words[i] = (Math.imul(1812433253, this.words[i - 1] ^ (this.words[i - 1] >>> 30)) + i) >>> 0;
    this.index = 624;
  }
  random() {
    if (this.index === 624) {
      for (let i = 0; i < 624; i++) {
        const value = (this.words[i] & 0x80000000) | (this.words[(i + 1) % 624] & 0x7fffffff);
        this.words[i] = this.words[(i + 397) % 624] ^ (value >>> 1) ^ ((value & 1) ? 0x9908b0df : 0);
      }
      this.index = 0;
    }
    let value = this.words[this.index++];
    value ^= value >>> 11;
    value ^= (value << 7) & 0x9d2c5680;
    value ^= (value << 15) & 0xefc60000;
    value ^= value >>> 18;
    return (value >>> 0) / 4294967296;
  }
}
const rng = new MersenneTwister(27);
export const random = () => rng.random();
