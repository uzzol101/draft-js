/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 * @flow
 * @emails oncall+draft_js
 */

'use strict';

import type {BlockNodeRecord} from 'BlockNodeRecord';
import type {DraftBlockRenderMap} from 'DraftBlockRenderMap';
import type {DraftInlineStyle} from 'DraftInlineStyle';
import type EditorState from 'EditorState';
import type {BidiDirection} from 'UnicodeBidiDirection';

const DraftEditorBlock = require('DraftEditorBlock.react');
const DraftOffsetKey = require('DraftOffsetKey');
const React = require('React');

const cx = require('cx');
const joinClasses: (
  className?: ?string,
  ...classes: Array<?string>
) => string = require('joinClasses');
const nullthrows = require('nullthrows');

type Props = {
  blockRenderMap: DraftBlockRenderMap,
  blockRendererFn: (block: BlockNodeRecord) => ?Object,
  blockStyleFn?: (block: BlockNodeRecord) => string,
  customStyleFn?: (style: DraftInlineStyle, block: BlockNodeRecord) => ?Object,
  customStyleMap?: Object,
  editorKey?: string,
  editorState: EditorState,
  preventScroll?: boolean,
  textDirectionality?: BidiDirection,
  ...
};

/**
 * Provide default styling for list items. This way, lists will be styled with
 * proper counters and indentation even if the caller does not specify
 * their own styling at all. If more than five levels of nesting are needed,
 * the necessary CSS classes can be provided via `blockStyleFn` configuration.
 */
const getListItemClasses = (
  type: string,
  depth: number,
  shouldResetCount: boolean,
  direction: BidiDirection,
): string => {
  return cx({
    'public/DraftStyleDefault/unorderedListItem':
      type === 'unordered-list-item',
    'public/DraftStyleDefault/orderedListItem': type === 'ordered-list-item',
    'public/DraftStyleDefault/reset': shouldResetCount,
    'public/DraftStyleDefault/depth0': depth === 0,
    'public/DraftStyleDefault/depth1': depth === 1,
    'public/DraftStyleDefault/depth2': depth === 2,
    'public/DraftStyleDefault/depth3': depth === 3,
    'public/DraftStyleDefault/depth4': depth >= 4,
    'public/DraftStyleDefault/listLTR': direction === 'LTR',
    'public/DraftStyleDefault/listRTL': direction === 'RTL',
  });
};

class TextComponent extends React.Component {


  render() {
    const {
      blockRenderMap,
      blockRendererFn,
      blockStyleFn,
      customStyleMap,
      customStyleFn,
      editorState,
      editorKey,
      preventScroll,
      textDirectionality,
    } = this.props;


    const content = editorState.getCurrentContent();
    const selection = editorState.getSelection();
    const forceSelection = editorState.mustForceSelection();
    const decorator = editorState.getDecorator();
    const directionMap = nullthrows(editorState.getDirectionMap());

    const blocksAsArray = content.getBlocksAsArray();
    const processedBlocks = [];
    let isFigure = false;

    let currentDepth = null;
    let lastWrapperTemplate = null;

    // for (let ii = 0; ii < blocksAsArray.length; ii++) {
      const block =　this.props.block
      const key = block.getKey();
      const blockType = block.getType();

      const customRenderer = blockRendererFn(block);
      let CustomComponent, customProps, customEditable;
      if (customRenderer) {
        CustomComponent = customRenderer.component;
        customProps = customRenderer.props;
        customEditable = customRenderer.editable;
      }

      const direction = textDirectionality
        ? textDirectionality
        : directionMap.get(key);
      const offsetKey = DraftOffsetKey.encode(key, 0, 0);
      const componentProps = {
        contentState: content,
        block,
        blockProps: customProps,
        blockStyleFn,
        customStyleMap,
        customStyleFn,
        decorator,
        direction,
        forceSelection,
        offsetKey,
        preventScroll,
        selection,
        tree: editorState.getBlockTree(key),
      };

      const configForType =
        blockRenderMap.get(blockType) || blockRenderMap.get('unstyled');
      const wrapperTemplate = configForType.wrapper;

      const Element =
        configForType.element || blockRenderMap.get('unstyled').element;

      const depth = block.getDepth();
      let className = '';
      if (blockStyleFn) {
        className = blockStyleFn(block);
      }

      // List items are special snowflakes, since we handle nesting and
      // counters manually.
      if (Element === 'li') {
        const shouldResetCount =
          lastWrapperTemplate !== wrapperTemplate ||
          currentDepth === null ||
          depth > currentDepth;
        className = joinClasses(
          className,
          getListItemClasses(blockType, depth, shouldResetCount, direction),
        );
      }

      const Component = CustomComponent || DraftEditorBlock;
      let childProps = {
        className,
        'data-block': true,
        'data-editor': editorKey,
        'data-offset-key': offsetKey,
        key,
      };
      if (customEditable !== undefined) {
        childProps = {
          ...childProps,
          contentEditable: customEditable,
          suppressContentEditableWarning: true,
        };
      }


      let child = ''

      if (Element == 'figure') {
        child = ''
      } else {
        child = React.createElement(
        Element,
        childProps,
        /* $FlowFixMe[incompatible-type] (>=0.112.0 site=www,mobile) This
         * comment suppresses an error found when Flow v0.112 was deployed. To
         * see the error delete this comment and run Flow. */
        <DraftEditorBlock {...componentProps} key={key} />,
      );
      }
      
      // const child = React.createElement(
      //   Element,
      //   childProps,
      //   /* $FlowFixMe[incompatible-type] (>=0.112.0 site=www,mobile) This
      //    * comment suppresses an error found when Flow v0.112 was deployed. To
      //    * see the error delete this comment and run Flow. */
      //   <Component {...componentProps} key={key} />,
      // );

      processedBlocks.push({
        block: child,
        wrapperTemplate,
        key,
        offsetKey,
      });


      if (wrapperTemplate) {
        currentDepth = block.getDepth();
      } else {
        currentDepth = null;
      }
      lastWrapperTemplate = wrapperTemplate;
    // }

    // Group contiguous runs of blocks that have the same wrapperTemplate
    // const outputBlocks = [];
    // for (let ii = 0; ii < processedBlocks.length; ) {
    //   const info: any = processedBlocks[ii];
    //   if (info.wrapperTemplate) {
    //     const blocks = [];
    //     do {
    //       blocks.push(processedBlocks[ii].block);
    //       ii++;
    //     } while (
    //       ii < processedBlocks.length &&
    //       processedBlocks[ii].wrapperTemplate === info.wrapperTemplate
    //     );
    //     const wrapperElement = React.cloneElement(
    //       info.wrapperTemplate,
    //       {
    //         key: info.key + '-wrap',
    //         'data-offset-key': info.offsetKey,
    //       },
    //       blocks,
    //     );
    //     outputBlocks.push(wrapperElement);
    //   } else {
    //     outputBlocks.push(info.block);
    //     ii++;
    //   }
    // }

    // if (this.props.customKey % 2 == 0) {
    // return <div data-contents="true">{outputBlocks}</div>

    // } else {

    //   return <article data-contents="true">{outputBlocks}</article>;
    // }

    return child


  }

}


class GenericComponent extends React.Component {
  shouldComponentUpdate () {
    console.log('gen called should update')
    return false
  }

  componentDidMount () {
    console.log('gen mounting')
  }

  componentWillUnmount () {
    console.log('I am going to die')
  }

  componentDidUpdate () {
    console.log('gen updated')
  }

  // render () {
  //   let {DraftEditorBlock, componentProps} = this.props

  //   if (this.props.type == 'atomic') {
  //     return <MediaCompoennt  />
  //   } else {
  //     return <DraftEditorBlock {...componentProps} />
  //   }
  // }

  render () {
    
    return <figure><video controls src={'https://www.youtube.com/embed/npXG4Q3umxI'}  /></figure>
      

    
  }

 }


class MediaCompoennt extends React.Component {

  

  shouldComponentUpdate () {
    console.log('called should update')
    return false
  }

  componentDidMount () {
    console.log('mounting')
  }

  componentDidUpdate () {
    console.log('updated')
  }

  render () {
    console.log('rendering')
    // let props = this.props
    // const entity = props.contentState.getEntity(
    //   props.block.getEntityAt(0)
    // );
    // const {src} = entity.getData();
    // const type = entity.getType();
  
    
    return (
      <>
      return <video controls src={'https://www.youtube.com/embed/npXG4Q3umxI'}  />;

      </>
    )
    }
  
};


/**
 * `DraftEditorContents` is the container component for all block components
 * rendered for a `DraftEditor`. It is optimized to aggressively avoid
 * re-rendering blocks whenever possible.
 *
 * This component is separate from `DraftEditor` because certain props
 * (for instance, ARIA props) must be allowed to update without affecting
 * the contents of the editor.
 */
class DraftEditorContents extends React.Component<Props> {

  constructor(props) {
    super(props)
    this.state = {
      count: 0
    }
  }

  shouldComponentUpdate(nextProps: Props): boolean {
    const prevEditorState = this.props.editorState;
    const nextEditorState = nextProps.editorState;

    const prevCustomKey = this.props.customKey;
    const nextCustomKey = nextProps.customKey;

    const prevDirectionMap = prevEditorState.getDirectionMap();
    const nextDirectionMap = nextEditorState.getDirectionMap();

    // Text direction has changed for one or more blocks. We must re-render.
    if (prevDirectionMap !== nextDirectionMap) {
      return true;
    }

    if (prevCustomKey !== nextCustomKey) {
      console.log('custom key has changed $$$$$$$$$$')
      
      return true;
    }

    const didHaveFocus = prevEditorState.getSelection().getHasFocus();
    const nowHasFocus = nextEditorState.getSelection().getHasFocus();

    if (didHaveFocus !== nowHasFocus) {
      return true;
    }

    const nextNativeContent = nextEditorState.getNativelyRenderedContent();

    const wasComposing = prevEditorState.isInCompositionMode();
    const nowComposing = nextEditorState.isInCompositionMode();

    // If the state is unchanged or we're currently rendering a natively
    // rendered state, there's nothing new to be done.
    if (
      prevEditorState === nextEditorState ||
      (nextNativeContent !== null &&
        nextEditorState.getCurrentContent() === nextNativeContent) ||
      (wasComposing && nowComposing)
    ) {
      return false;
    }

    const prevContent = prevEditorState.getCurrentContent();
    const nextContent = nextEditorState.getCurrentContent();
    const prevDecorator = prevEditorState.getDecorator();
    const nextDecorator = nextEditorState.getDecorator();
    return (
      wasComposing !== nowComposing ||
      prevContent !== nextContent ||
      prevDecorator !== nextDecorator ||
      nextEditorState.mustForceSelection()
    );
  }

  componentDidMount () {
    console.log('********* mounting Content core')
  }

  render(): React.Node {

    const {
      blockRenderMap,
      blockRendererFn,
      blockStyleFn,
      customStyleMap,
      customStyleFn,
      editorState,
      editorKey,
      preventScroll,
      textDirectionality,
    } = this.props;


    const content = editorState.getCurrentContent();
    const selection = editorState.getSelection();
    const forceSelection = editorState.mustForceSelection();
    const decorator = editorState.getDecorator();
    const directionMap = nullthrows(editorState.getDirectionMap());

    const blocksAsArray = content.getBlocksAsArray();
    const processedBlocks = [];
    let isFigure = false;

    let currentDepth = null;
    let lastWrapperTemplate = null;

    // for (let ii = 0; ii < blocksAsArray.length; ii++) {
    //   const block = blocksAsArray[ii];
    //   const key = block.getKey();
    //   const blockType = block.getType();
  
    console.log('Block as array ', blocksAsArray)
   
    return <div data-contents="true">
      {
        blocksAsArray.map(block => {
          const key = block.getKey();
         const blockType = block.getType();
          if (blockType == 'atomic') {
        return <GenericComponent key={key} />
       
          } else {
          return <TextComponent block={block}　key={key + this.props.customKey} {...this.props} />
          }
        })
      }
    </div>;


  }
}

module.exports = DraftEditorContents;
