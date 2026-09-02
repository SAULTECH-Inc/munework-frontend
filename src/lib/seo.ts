import { useEffect } from 'react';

/**
 * Per-route document metadata.
 *
 * index.html carries one static set of tags, so without this every route
 * inherits the landing page's title and Open Graph image — a shared company
 * profile previews as the homepage, and every page competes for the same search
 * result. This rewrites the handful of tags that matter on mount and restores
 * them on unmount.
 *
 * Written by hand rather than pulling in react-helmet-async: the surface here is
 * six tags on a few public routes, and Google renders JS before reading them.
 */

interface Seo {
  title?: string;
  description?: string;
  /** Path or absolute URL. Relative values resolve against the current origin. */
  canonical?: string;
  image?: string;
  /** Keeps a page out of search results while still reachable by link. */
  noindex?: boolean;
  type?: 'website' | 'profile' | 'article';
}

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function useSeo({ title, description, canonical, image, noindex, type = 'website' }: Seo) {
  useEffect(() => {
    const previousTitle = document.title;

    if (title) {
      document.title = title;
      setMeta('meta[property="og:title"]', 'property', 'og:title', title);
      setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    }

    if (description) {
      setMeta('meta[name="description"]', 'name', 'description', description);
      setMeta('meta[property="og:description"]', 'property', 'og:description', description);
      setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    }

    if (image) {
      const abs = image.startsWith('http') ? image : `${window.location.origin}${image}`;
      setMeta('meta[property="og:image"]', 'property', 'og:image', abs);
      setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', abs);
    }

    const url = canonical
      ? (canonical.startsWith('http') ? canonical : `${window.location.origin}${canonical}`)
      : window.location.href.split('?')[0];
    setLink('canonical', url);
    setMeta('meta[property="og:url"]', 'property', 'og:url', url);
    setMeta('meta[property="og:type"]', 'property', 'og:type', type);

    setMeta(
      'meta[name="robots"]',
      'name',
      'robots',
      noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
    );

    return () => {
      document.title = previousTitle;
      // Leaving a stale noindex behind would quietly de-index the next route.
      setMeta('meta[name="robots"]', 'name', 'robots', 'index, follow, max-image-preview:large');
    };
  }, [title, description, canonical, image, noindex, type]);
}

/**
 * Injects a JSON-LD block for the lifetime of the component.
 * Structured data is what produces rich results rather than a plain blue link.
 */
export function useJsonLd(data: Record<string, any> | null) {
  useEffect(() => {
    if (!data) return;
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.text = JSON.stringify(data);
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, [data]);
}
