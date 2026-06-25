import type { MDXComponents } from 'mdx/types';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: (props) => (
      <h1 className="my-6 scroll-mt-20 text-4xl font-bold" {...props} />
    ),
    h2: (props) => (
      <h2 className="my-5 scroll-mt-20 text-3xl font-bold" {...props} />
    ),
    h3: (props) => (
      <h3 className="my-4 scroll-mt-20 text-2xl font-bold" {...props} />
    ),
    h4: (props) => (
      <h4 className="my-3 scroll-mt-20 text-xl font-bold" {...props} />
    ),
    p: (props) => <p className="my-4 leading-relaxed" {...props} />,
    a: (props) => <a className="text-purple" {...props} />,
    ul: (props) => <ul className="my-4 list-disc pl-4" {...props} />,
    ol: (props) => <ol className="my-4 list-decimal pl-4" {...props} />,
    li: (props) => <li className="my-1" {...props} />,
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
