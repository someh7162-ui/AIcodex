const fs = require('fs');
const docx = require('docx');
const { Document, Packer, Paragraph, TextRun, AlignmentType } = docx;

// Text Content
const titleText = "OCR识别技术";
const sections = [
    {
        title: "摘要",
        content: "随着深度学习技术的飞速发展，光学字符识别（OCR）已从传统的文档扫描识别演变为复杂的自然场景文本识别（STR）。本文综述了OCR技术的发展历程，重点探讨了从基于特征提取的传统算法到基于卷积神经网络（CNN）、循环神经网络（RNN）以及Transformer架构的深度学习模型的转变。文章分析了文本检测、文本识别以及端到端识别系统的核心技术架构，总结了当前在复杂背景、艺术字体、多语言及超长文本处理中的研究现状。最后，本文对OCR与多模态大模型的融合趋势进行了展望。"
    },
    {
        title: "一、 引言",
        content: "OCR是指利用光电设备（如扫描仪或数码相机）捕获图像，并通过软件处理将其中的字符转化为机器可理解的文字编码的过程。它是计算机视觉（CV）与自然语言处理（NLP）的交叉领域。OCR技术经历了从早期针对特定字体、高对比度文档的模板匹配，到2000年代基于统计学习（如SVM、HMM）的方法，再到2012年以来基于深度学习（CNN、RNN、Transformer）的爆发式发展。现代OCR通常分为文本检测（Text Detection）和文本识别（Text Recognition）两个核心子任务。"
    },
    {
        title: "二、 应用场景",
        content: "OCR技术广泛应用于金融与政务数字化（如银行卡、发票、证件识别）、智慧交通（车牌识别）、移动互联网（拍照翻译、名片识别）、工业与零售（序列号追溯）以及辅助功能（视障人士TTS服务）等领域。此外，结合OCR的视觉问答（VQA）技术正在赋能更高级的文档理解应用。"
    },
    {
        title: "三、 技术难点",
        content: "尽管OCR在标准文档上已接近完美，但在自然场景中仍面临巨大挑战。首先是复杂的视觉环境，包括光照、遮挡和几何畸变；其次是文本本身的多样性，如艺术字体、手写体识别（HTR）的难度远高于印刷体；此外，多语言混合排版和超长文本的处理也对模型的泛化能力提出了极高要求。"
    },
    {
        title: "四、 结论与展望",
        content: "未来OCR技术将向端到端（End-to-End）一体化模型发展，减少误差传递。同时，与大型语言模型（LLM）的结合将提升语义纠错和结构化提取能力。少样本学习和智能文档理解（IDP）也将成为重要的研究方向。"
    }
];

// Helper for Body Paragraph: Song, Size 5 (10.5pt = 21 half-points), Indent 2 chars
// 1 char approx 10.5pt. 2 chars = 21pt. 21pt * 20 = 420 twips.
const createBodyParagraph = (text) => {
    return new Paragraph({
        children: [
            new TextRun({
                text: text,
                font: "SimSun", // 宋体
                size: 21,       // 五号 (10.5pt)
            }),
        ],
        indent: {
            firstLine: 420, // 2 chars indent
        },
        spacing: {
            line: 360, // ~1.5 line spacing
        }
    });
};

// Helper for Section Title: Bold, Song, Size 5
const createSectionTitle = (text) => {
    return new Paragraph({
        children: [
            new TextRun({
                text: text,
                font: "SimSun",
                size: 21,
                bold: true,
            }),
        ],
        indent: {
             firstLine: 420,
        },
        spacing: {
            before: 200,
            after: 100,
        }
    });
};

// Main Title Paragraph: Black Body (SimHei), Size 3 (16pt = 32 half-points)
const mainTitle = new Paragraph({
    children: [
        new TextRun({
            text: titleText,
            font: "SimHei", // 黑体
            size: 32,       // 三号 (16pt)
        }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: {
        after: 400,
    }
});

// Build Children
const docChildren = [mainTitle];
sections.forEach(sec => {
    docChildren.push(createSectionTitle(sec.title));
    docChildren.push(createBodyParagraph(sec.content));
});

const doc = new Document({
    sections: [{
        properties: {},
        children: docChildren,
    }],
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync("ocr识别技术.docx", buffer);
    console.log("Document created successfully.");
});
