<?php

namespace MediaWiki\Extension\SmartComments;

use HTMLForm;

class RefreshAction extends \FormAction {

	/**
	 * @return string
	 */
	public function getName() {
		return 'screfresh';
	}

	/**
	 * We invalidate the cache for the current page and then redirect the user to the page with SmartComments enabled again
	 *
	 * @param HTMLForm $form
	 * @return void
	 */
	protected function alterForm( HTMLForm $form ) {
		$this->getTitle()->invalidateCache(wfTimestamp());
		$this->getWikiPage()->doPurge();
		$this->getOutput()->redirect( $this->getTitle()->getFullURL( [ 'scenabled' => '1' ] ) );
	}

	/**
	 * @see \FormAction::onSubmit()
	 */
	public function onSubmit( $data ) {	}

	/**
	 * @see FormAction::onSuccess()
	 */
	public function onSuccess() { }

}

