import { NextRequest, NextResponse } from 'next/server';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import _ from 'lodash';
import path from "path"
import fs from 'fs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const referenceText = formData.get('referenceText') as string;

    if (!audioFile || !referenceText) {
      return NextResponse.json({ error: '音声ファイルまたは参照テキストが見つかりません' }, { status: 400 });
    }

    const subscriptionKey = process.env.AZURE_SPEECH_KEY as string;
    const region = process.env.AZURE_SPEECH_REGION as string;

    // 音声ファイルをArrayBufferに変換
    const arrayBuffer = await audioFile.arrayBuffer();
    
    // 一時ファイルとして保存
    const tempFilePath = `/tmp/${Date.now()}_audio.wav`;
    fs.writeFileSync(tempFilePath, Buffer.from(arrayBuffer));
    
    // 音声設定
    const audioConfig = sdk.AudioConfig.fromWavFileInput(Buffer.from(arrayBuffer));

    // Speech設定
    const speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, region);
    const language = "en-US";
    speechConfig.speechRecognitionLanguage = language;
    speechConfig.outputFormat = sdk.OutputFormat.Detailed;
    speechConfig.setProperty(sdk.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs, "5000");
    speechConfig.setProperty(sdk.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs, "1000");

    // 発音評価の設定
    const pronunciationAssessmentConfig = new sdk.PronunciationAssessmentConfig(
      referenceText,
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Phoneme,
      true
    );
    pronunciationAssessmentConfig.enableProsodyAssessment = true;

    // 音声認識の設定
    const reco = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    pronunciationAssessmentConfig.applyTo(reco);

    // 結果を格納する変数
    let assessmentResults = {
      pronunciationScore: 0,
      accuracyScore: 0,
      fluencyScore: 0,
      completenessScore: 0,
      prosodyScore: 0,
      words: []
    };

    // 音声認識の実行
    return new Promise<NextResponse>((resolve) => {
      reco.recognizeOnceAsync(
        (result: sdk.SpeechRecognitionResult) => {
          try {
            console.log("音声認識結果:", {
              reason: sdk.ResultReason[result.reason],
              text: result.text,
              errorDetails: result.errorDetails,
              properties: result.properties
            });

            if (result.reason === sdk.ResultReason.RecognizedSpeech) {
              const pronunciationResult = sdk.PronunciationAssessmentResult.fromResult(result);
              console.log("発音評価結果:", {
                pronunciationScore: pronunciationResult.pronunciationScore,
                accuracyScore: pronunciationResult.accuracyScore,
                fluencyScore: pronunciationResult.fluencyScore,
                completenessScore: pronunciationResult.completenessScore,
                prosodyScore: pronunciationResult.prosodyScore
              });
              
              assessmentResults = {
                pronunciationScore: pronunciationResult.pronunciationScore,
                accuracyScore: pronunciationResult.accuracyScore,
                fluencyScore: pronunciationResult.fluencyScore,
                completenessScore: pronunciationResult.completenessScore,
                prosodyScore: pronunciationResult.prosodyScore,
                words: []
              };

              resolve(NextResponse.json(assessmentResults));
            } else {
              throw new Error(`音声認識に失敗しました: ${sdk.ResultReason[result.reason]} - ${result.errorDetails || "エラー詳細なし"}`);
            }
          } catch (error) {
            console.error("発音評価の処理中にエラーが発生しました:", error);
            resolve(
              NextResponse.json(
                { 
                  error: "発音評価の処理に失敗しました", 
                  details: error instanceof Error ? error.message : "Unknown error",
                  result: result ? {
                    reason: sdk.ResultReason[result.reason],
                    text: result.text,
                    errorDetails: result.errorDetails
                  } : null
                },
                { status: 500 }
              )
            );
          } finally {
            reco.close();
            // 一時ファイルを削除
            try {
              fs.unlinkSync(tempFilePath);
            } catch (e) {
              console.error("一時ファイルの削除に失敗しました:", e);
            }
          }
        },
        (error: any) => {
          console.error("音声認識エラー:", {
            error: error,
            message: error.message,
            details: error.errorDetails
          });
          reco.close();
          // 一時ファイルを削除
          try {
            fs.unlinkSync(tempFilePath);
          } catch (e) {
            console.error("一時ファイルの削除に失敗しました:", e);
          }
          resolve(
            NextResponse.json(
              { 
                error: "音声認識に失敗しました", 
                details: error instanceof Error ? error.message : "Unknown error",
                errorDetails: error.errorDetails
              },
              { status: 500 }
            )
          );
        }
      );
    });
  } catch (error) {
    console.error("発音評価の処理中にエラーが発生しました:", error);
    return NextResponse.json(
      { error: "発音評価の処理に失敗しました", details: error },
      { status: 500 }
    );
  }
}