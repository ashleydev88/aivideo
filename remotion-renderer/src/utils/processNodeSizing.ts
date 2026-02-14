import { MotionNode } from '../types/MotionGraph';

const MIN_WIDTH = 220;
const MAX_WIDTH = 460;
const MIN_HEIGHT = 170;
const MAX_HEIGHT = 320;

const stripTags = (value?: string) => (value || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const estimateLines = (charCount: number, charsPerLine: number) => {
    if (charCount <= 0) return 0;
    return Math.max(1, Math.ceil(charCount / Math.max(1, charsPerLine)));
};

export const estimateProcessNodeSize = (node: MotionNode) => {
    const label = stripTags(node.data.label);
    const subLabel = stripTags(node.data.subLabel);
    const description = stripTags(node.data.description);
    const labelChars = label.length;
    const subLabelChars = subLabel.length;
    const descriptionChars = description.length;

    const widthFromText = MIN_WIDTH + (labelChars * 4) + (subLabelChars * 2.5) + (descriptionChars * 1.5);
    const width = clamp(Math.round(widthFromText), MIN_WIDTH, MAX_WIDTH);

    // Estimate with slightly more conservative font metrics (avg widths)
    // Headline (24px bold) ~ 13-14px avg
    // Sublabel (14px bold) ~ 8-9px avg
    // Body (18px regular) ~ 9-10px avg

    const contentWidth = width - 40;
    const labelCharsPerLine = Math.floor(contentWidth / 14);
    const subLabelCharsPerLine = Math.floor(contentWidth / 9);
    const descCharsPerLine = Math.floor(contentWidth / 10);

    const labelLines = estimateLines(labelChars, labelCharsPerLine);
    const subLabelLines = estimateLines(subLabelChars, subLabelCharsPerLine);
    const descriptionLines = estimateLines(descriptionChars, descCharsPerLine);

    const estimatedHeight =
        2 + // top bar
        40 + // padding y
        48 + // icon
        12 + // gap
        (labelLines * 32) + // Line height for title
        (subLabelLines > 0 ? (subLabelLines * 20) + 4 : 0) +
        (descriptionLines > 0 ? (descriptionLines * 26) + 8 : 0) +
        16; // bottom buffer

    // Relaxed height clamp to prevent clipping
    const height = clamp(Math.round(estimatedHeight), MIN_HEIGHT, 1000);
    return { width, height };
};

export const getNormalizedProcessSize = (nodes: MotionNode[]) => {
    const measured = nodes.map(estimateProcessNodeSize);
    const width = Math.max(...measured.map(size => size.width), MIN_WIDTH);
    const height = Math.max(...measured.map(size => size.height), MIN_HEIGHT);
    return { width, height };
};
