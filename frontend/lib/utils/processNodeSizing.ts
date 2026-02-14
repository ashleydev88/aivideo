import { MotionNode } from '@/lib/types/MotionGraph';

const MIN_WIDTH = 220;
const MAX_WIDTH = 460;
const MIN_HEIGHT = 220;
const MAX_HEIGHT = 520;

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
        12 + // h-3 accent bar
        4 + // top+bottom border
        64 + // p-8 top/bottom
        64 + // icon block
        8 + // icon mb-2
        16 + // gap-4 between icon and text
        (labelLines * 34) +
        8 +
        (subLabelLines > 0 ? (subLabelLines * 20) + 6 : 0) +
        (descriptionLines > 0 ? (descriptionLines * 30) + 10 : 0) +
        20;

    const height = clamp(Math.round(estimatedHeight), MIN_HEIGHT, MAX_HEIGHT);
    return { width, height };
};

export const getNormalizedProcessSize = (nodes: MotionNode[]) => {
    const measured = nodes.map(estimateProcessNodeSize);
    const width = Math.max(...measured.map(size => size.width), MIN_WIDTH);
    const height = Math.max(...measured.map(size => size.height), MIN_HEIGHT);
    return { width, height };
};
