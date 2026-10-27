import { safeInformationUrl, type InformationBlock } from './api';
import './information.css';
export function InformationBlocks({ blocks }: { blocks: InformationBlock[] }) {
  return (
    <div className='information-blocks'>
      {blocks.map(block => (
        <section className='fde-panel information-block' key={block.id}>
          <h2>{block.title}</h2>
          <p className='information-body'>{block.body}</p>
          {block.links.length > 0 && (
            <ul>
              {block.links
                .filter(link => safeInformationUrl(link.url))
                .map((link, index) => (
                  <li key={index}>
                    <a href={link.url} target='_blank' rel='noopener noreferrer'>
                      {link.label}
                      <span aria-hidden='true'> ↗</span>
                    </a>
                  </li>
                ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
