import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { cn } from './ui/utils';

const markdownComponents: Components = {
  p: ({ children, className, ...props }) => (
    <p className={cn('mb-2 last:mb-0 text-[15px] leading-relaxed', className)} {...props}>
      {children}
    </p>
  ),
  strong: ({ children, className, ...props }) => (
    <strong className={cn('font-semibold text-gray-900', className)} {...props}>
      {children}
    </strong>
  ),
  ul: ({ children, className, ...props }) => (
    <ul className={cn('mb-3 ml-4 list-disc space-y-1 text-[15px]', className)} {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, className, ...props }) => (
    <ol className={cn('mb-3 ml-4 list-decimal space-y-1 text-[15px]', className)} {...props}>
      {children}
    </ol>
  ),
  li: ({ children, className, ...props }) => (
    <li className={cn('leading-relaxed', className)} {...props}>
      {children}
    </li>
  ),
  h1: ({ children, className, ...props }) => (
    <h1 className={cn('mb-2 mt-3 text-lg font-semibold text-gray-900 first:mt-0', className)} {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, className, ...props }) => (
    <h2 className={cn('mb-1.5 mt-2.5 text-base font-semibold text-gray-900 first:mt-0', className)} {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, className, ...props }) => (
    <h3 className={cn('mb-1 mt-2 text-sm font-semibold text-gray-800 first:mt-0', className)} {...props}>
      {children}
    </h3>
  ),
  blockquote: ({ children, className, ...props }) => (
    <blockquote
      className={cn('border-l-4 border-gray-300 pl-3 my-2 text-gray-700 italic', className)}
      {...props}
    >
      {children}
    </blockquote>
  ),
  code: ({ className, children, ...props }) => (
    <code
      className={cn('rounded bg-gray-200 px-1.5 py-0.5 text-sm font-mono text-gray-800', className)}
      {...props}
    >
      {children}
    </code>
  ),
  pre: ({ children, className, ...props }) => (
    <pre className={cn('mb-3 rounded-md bg-gray-100 p-2 overflow-x-auto text-sm', className)} {...props}>
      {children}
    </pre>
  ),
  table: ({ children, className, ...props }) => (
    <div className="my-3 overflow-x-auto rounded-md border border-gray-200">
      <table className={cn('min-w-full text-sm', className)} {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-gray-100 border-b border-gray-200" {...props}>
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }) => <tbody className="divide-y divide-gray-100" {...props}>{children}</tbody>,
  tr: ({ children, ...props }) => <tr {...props}>{children}</tr>,
  th: ({ children, className, ...props }) => (
    <th
      className={cn('px-3 py-2 text-left font-semibold text-gray-800', className)}
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, className, ...props }) => (
    <td className={cn('px-3 py-2 text-gray-700', className)} {...props}>
      {children}
    </td>
  ),
  hr: () => <hr className="my-3 border-gray-200" />,
};

interface ChatMessageContentProps {
  content: string;
  className?: string;
}

/**
 * AI 답변 텍스트를 마크다운으로 렌더링합니다.
 * 제목, 목록, 표, 강조, 코드 등이 시각적으로 구분되도록 스타일을 적용합니다.
 */
export function ChatMessageContent({ content, className }: ChatMessageContentProps) {
  return (
    <div className={cn('chat-markdown break-words', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
