import { DocumentResult, SearchDoc } from './results/DocumentResult'
import { FileResult, SearchFile } from './results/FileResult'
import { LinkResult, SearchLink } from './results/LinkResult'
import { MediaResult, SearchMedia } from './results/MediaResult'
import { MessageResult, SearchMessage } from './results/MessageResult'

type SearchResult = SearchMessage | SearchDoc | SearchFile | SearchMedia | SearchLink

interface SearchResultsProps {
  results: SearchResult[]
  activeTab: string
}

export const SearchResults = ({ results, activeTab }: SearchResultsProps) => {
  const renderResult = (item: SearchResult) => {
    switch (activeTab) {
      case 'Messages':
        return <MessageResult key={item.id} message={item as any} />
      case 'Docs':
        return <DocumentResult key={item.id} document={item as any} />
      case 'Files':
        return <FileResult key={item.id} file={item as any} />
      case 'Images & Videos':
        return <MediaResult key={item.id} media={item as any} />
      case 'Links':
        return <LinkResult key={item.id} link={item as any} />
      default:
        return null
    }
  }

  return <div className='space-y-3'>{results.map(renderResult)}</div>
}
