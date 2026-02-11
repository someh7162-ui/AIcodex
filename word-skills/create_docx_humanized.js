const fs = require('fs');
const docx = require('docx');
const { Document, Packer, Paragraph, TextRun, AlignmentType } = docx;

// Text Content - Humanized Version
const titleText = "OCR识别技术";
const sections = [
    {
        title: "摘要",
        content: "从早期的文档电子化到如今的万物皆可读，光学字符识别（OCR）技术完成了一次从“感知”到“认知”的跨越。本文将目光投向这一技术演进背后的驱动力，剖析了以CRNN、Transformer为代表的深度学习架构是如何一步步取代传统手工特征工程的。我们特别关注自然场景文本（STR）识别中的“硬骨头”——诸如艺术字形变、复杂光照干扰以及多语言混排等现实挑战，并探讨了当OCR遇见多模态大模型时，可能产生的新化学反应。"
    },
    {
        title: "一、 引言",
        content: "让计算机像人眼一样“看懂”文字，这在计算机视觉领域曾被视为一项浩大的工程。OCR，这项致力于连接物理世界与数字世界的技术，最早可以追溯到上世纪对特定字体的模板匹配尝试。但真正的转折点发生在2012年——深度学习的爆发让OCR不再依赖繁琐的SIFT或HOG特征。现在的OCR系统，本质上已进化为一个极其精密的流水线：先由文本检测网络在复杂的背景中“框”出文字，再由识别网络“读”出内容。这种技术范式的转移，彻底改变了我们处理非结构化数据的方式。"
    },
    {
        title: "二、 应用场景",
        content: "这项技术早已渗透进我们生活的毛细血管，变得润物细无声。在停车场的道闸前，它是无需停车缴费的幕后推手；在手机相册里，它是“长按提取文字”的便捷功能。金融行业无疑是最大的受益者之一，以前需要柜员手工录入的成堆票据、身份证和银行卡，现在仅需毫秒级的扫描即可入库。更进一步，在工业流水线上，OCR成为了质量检测的“眼睛”，死死盯着每一个零件上的序列号，确保生产的可追溯性万无一失。"
    },
    {
        title: "三、 技术难点",
        content: "尽管我们在处理标准扫描文档时已能达到99%以上的准确率，但在真实世界里，OCR依然常常“犯错”。首先，自然场景下的光照从来不会配合算法——斑驳的树影、玻璃的反光或是强光过曝，都能让文字瞬间“隐形”。其次是棘手的几何畸变，路边的广告牌很少正对着摄像头，弯曲、倾斜甚至折叠的文字，对传统的矩形框检测提出了巨大的考验。此外，中文汉字数以万计的庞大类别，以及手写体那龙飞凤舞的笔迹，至今仍是检验模型泛化能力的试金石。"
    },
    {
        title: "四、 结论与展望",
        content: "OCR技术的下半场，拼的不再是单纯的字符识别率，而是深层的“理解力”。未来的趋势显而易见：检测与识别割裂的局面极有可能被端到端（End-to-End）模型终结，误差传递将成为历史。更令人兴奋的是，当OCR接入大型语言模型（LLM）的“大脑”后，它将不再只是一个认字的工具，而是进化为能读懂表格逻辑、理解文档语义的智能助手。这，才是文档智能化的终极形态。"
    }
];

// Helper for Body Paragraph: Song, Size 5 (10.5pt = 21 half-points), Indent 2 chars
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
    console.log("Humanized document created successfully.");
});
