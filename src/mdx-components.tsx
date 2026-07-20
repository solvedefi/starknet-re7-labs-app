import type { MDXComponents } from 'mdx/types';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: (props) => (
      <h1 className="my-6 scroll-mt-20 text-4xl font-bold" {...props} />
    ),
    h2: (props) => (
      <h2 className="mb-5 mt-14 scroll-mt-20 text-3xl font-bold" {...props} />
    ),
    h3: (props) => (
      <h3 className="mb-4 mt-12 scroll-mt-20 text-2xl font-bold" {...props} />
    ),
    h4: (props) => (
      <h4 className="mb-3 mt-8 scroll-mt-20 text-xl font-bold" {...props} />
    ),
    p: (props) => <p className="my-8 leading-7" {...props} />,
    a: (props) => (
      <a
        className="text-white underline underline-offset-2 transition-colors duration-200 hover:text-[#7F49E5]"
        {...props}
      />
    ),
    ul: (props) => <ul className="my-8 list-disc space-y-3 pl-5" {...props} />,
    ol: (props) => (
      <ol className="my-8 list-decimal space-y-3 pl-5" {...props} />
    ),
    li: (props) => <li className="leading-7" {...props} />,
    code: (props) => (
      <code className="rounded-md bg-white/10 px-2 py-1" {...props} />
    ),
    hr: () => <hr className="my-6 border-white/20" />,
    blockquote: (props) => (
      <blockquote
        className="my-4 border-l-4 border-gray-500 pl-4 italic"
        {...props}
      />
    ),
    ...components,
  };
}
