import axios, { AxiosError } from 'axios';
import { load } from 'cheerio';
import { Logger } from '@nestjs/common';

type CheerioInstance = ReturnType<typeof load>;

export interface ArticleContent {
  title: string | null;
  content: string | null;
  author: string | null;
  publishedAt: string | null;
}

const logger = new Logger('ArticleScraper');

/**
 * Scrapes article content from a news URL.
 * Uses common selectors for Indonesian news sites.
 */
export async function scrapeArticleContent(url: string): Promise<ArticleContent> {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'DisasterPulse/1.0 (+https://disasterpulse.id)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
      },
      maxRedirects: 5,
    });

    const html = response.data;
    const $ = load(html);

    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .ads, .advertisement, .social-share, .related-posts, .comments, noscript, iframe').remove();

    // Extract title - try multiple common selectors
    const title = extractTitle($);

    // Extract main article content
    const content = extractContent($);

    // Extract author
    const author = extractAuthor($);

    // Extract publish date
    const publishedAt = extractPublishDate($);

    return {
      title,
      content,
      author,
      publishedAt,
    };
  } catch (error) {
    const axiosError = error as AxiosError;
    logger.warn(`Failed to scrape article ${url}: ${axiosError.message}`);
    return {
      title: null,
      content: null,
      author: null,
      publishedAt: null,
    };
  }
}

function extractTitle($: CheerioInstance): string | null {
  const selectors = [
    'h1.title',
    'h1.entry-title',
    'h1.post-title',
    'h1.article-title',
    'h1[itemprop="headline"]',
    'article h1',
    '.article-header h1',
    '.content-detail h1',
    'meta[property="og:title"]',
    'meta[name="title"]',
    'h1',
  ];

  for (const selector of selectors) {
    if (selector.startsWith('meta')) {
      const content = $(selector).attr('content');
      if (content?.trim()) return content.trim();
    } else {
      const text = $(selector).first().text().trim();
      if (text) return text;
    }
  }

  return null;
}

function extractContent($: CheerioInstance): string | null {
  // Try structured selectors first (common on Indonesian news sites)
  const contentSelectors = [
    // Indonesian news site specific selectors
    '.detail__body-text',         // Detik
    '.read__content',             // Kompas
    '.content-detail',            // CNN Indonesia
    '.article-content-body__item-content', // Liputan6
    '.post-content',              // Antara
    '.content',                   // Tempo
    '.artikel',                   // Republika
    '.article-body',              // Media Indonesia
    '[itemprop="articleBody"]',   // Schema.org standard
    'article .content',
    'article .text',
    '.article-content',
    '.entry-content',
    '.post-body',
    '.story-body',
    'article p',
    '.article p',
  ];

  for (const selector of contentSelectors) {
    const element = $(selector);
    if (element.length > 0) {
      // Get all paragraph text within the content area
      const paragraphs: string[] = [];

      if (selector === 'article p' || selector === '.article p') {
        // For paragraph-based selectors, collect all paragraphs
        element.each((_, el) => {
          const text = $(el).text().trim();
          if (text && text.length > 20) {
            paragraphs.push(text);
          }
        });
      } else {
        // For container selectors, extract paragraphs within
        element.find('p').each((_, el) => {
          const text = $(el).text().trim();
          if (text && text.length > 20) {
            paragraphs.push(text);
          }
        });

        // If no paragraphs found, try getting direct text
        if (paragraphs.length === 0) {
          const text = element.text().trim();
          if (text && text.length > 50) {
            paragraphs.push(text);
          }
        }
      }

      if (paragraphs.length > 0) {
        return paragraphs.join('\n\n');
      }
    }
  }

  // Fallback: extract all visible paragraph text
  const fallbackParagraphs: string[] = [];
  $('p').each((_, el) => {
    const text = $(el).text().trim();
    // Filter out very short paragraphs (likely navigation or ads)
    if (text && text.length > 50) {
      fallbackParagraphs.push(text);
    }
  });

  if (fallbackParagraphs.length > 0) {
    return fallbackParagraphs.slice(0, 20).join('\n\n'); // Limit to first 20 paragraphs
  }

  return null;
}

function extractAuthor($: CheerioInstance): string | null {
  const selectors = [
    '[rel="author"]',
    '[itemprop="author"]',
    '.author-name',
    '.author',
    '.byline',
    'meta[name="author"]',
    'meta[property="article:author"]',
  ];

  for (const selector of selectors) {
    if (selector.startsWith('meta')) {
      const content = $(selector).attr('content');
      if (content?.trim()) return content.trim();
    } else {
      const text = $(selector).first().text().trim();
      if (text) return text;
    }
  }

  return null;
}

function extractPublishDate($: CheerioInstance): string | null {
  const selectors = [
    'meta[property="article:published_time"]',
    'meta[name="pubdate"]',
    'meta[name="date"]',
    'time[datetime]',
    '[itemprop="datePublished"]',
    '.date',
    '.published',
  ];

  for (const selector of selectors) {
    if (selector.startsWith('meta')) {
      const content = $(selector).attr('content');
      if (content?.trim()) return content.trim();
    } else if (selector === 'time[datetime]') {
      const datetime = $('time[datetime]').attr('datetime');
      if (datetime?.trim()) return datetime.trim();
    } else {
      const text = $(selector).first().text().trim();
      if (text) return text;
    }
  }

  return null;
}
