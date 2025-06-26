import { FileResult, SearchFile } from './results/FileResult'
import { LinkResult, SearchLink } from './results/LinkResult'
import { MediaResult, SearchMedia } from './results/MediaResult'
import { MessageResult, SearchMessage } from './results/MessageResult'

type SearchResult = SearchMessage | SearchFile | SearchMedia | SearchLink

interface SearchResultsProps {
  results: SearchResult[]
  activeTab: string
  onClose: () => void
}

export const SearchResults = ({ results, activeTab, onClose }: SearchResultsProps) => {
  const renderResult = (item: SearchResult) => {
    switch (activeTab) {
      case 'Messages':
        return <MessageResult key={item.id} message={item as any} onClose={onClose} />
      case 'Files':
        return <FileResult key={item.id} file={item as any} onClose={onClose} />
      case 'Images & Videos':
        return <MediaResult key={item.id} media={item as any} onClose={onClose} />
      case 'Links':
        return <LinkResult key={item.id} link={item as any} onClose={onClose} />
      default:
        return null
    }
  }

  return <div className='space-y-3'>{results.map(renderResult)}</div>
}
