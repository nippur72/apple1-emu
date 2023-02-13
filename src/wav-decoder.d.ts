// Type definitions for wav-encoder 1.3
// Project: https://github.com/mohayonao/wav-encoder/
// Definitions by: Candid Dauth <https://github.com/cdauth>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

declare module "wav-decoder";

declare namespace WavDecoder {
   interface AudioData {
       sampleRate: number;
       channelData: Float32Array[];
   }

   interface Options {
       bitDepth: number;
       float: boolean;
       symmetric: boolean;
   }
}

declare const WavDecoder: {
   encode: {
       (audioData: WavDecoder.AudioData, opts?: WavDecoder.Options): Promise<ArrayBuffer>;
       sync: (audioData: WavDecoder.AudioData, opts?: WavDecoder.Options) => ArrayBuffer;
   }
};

export = WavDecoder;