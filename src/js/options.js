/**************************************************
* 	myNewTabWE by sakuyaa.
*	
*	https://github.com/sakuyaa/
**************************************************/
'use strict';

//简化函数
const $id = id => document.getElementById(id);

let myNewTabWE = {
	config: {},
	imageData: {},
	sites: [],
	
	notify: (message, title) => {
		browser.notifications.create({
			type: 'basic',
			message: message + '',
			title: title,
			iconUrl: browser.extension.getURL('image/home.svg')
		});
	},
	
	//获取参数
	getStorage: () => {
		return new Promise((resolve, reject) => {
			browser.storage.local.get({   //默认值
				config: {
					bingMaxHistory: 10,   //最大历史天数，可设置[2, 16]
					newTabOpen: true,   //是否新标签页打开导航链接
					title: '我的主页',   //网页标题
					useBigImage: true,   //bing图片的尺寸，0为默认的1366x768，1为1920x1080
					weatherSrc: 'http://i.tianqi.com/index.php?c=code&id=8&num=3'   //天气代码的URL
				},
				imageData: {
					lastCheckTime: 0,
					imageName: '',
					imageUrl: ''
				},
				sites: []
			}).then(storage => {
				myNewTabWE.config = storage.config;
				myNewTabWE.imageData = storage.imageData;
				myNewTabWE.sites = storage.sites;
				resolve();
			}, e => {
				myNewTabWE.notify(e, '获取myNewTabWE配置失败');
				reject();
			});
		});
	},
	setStorage: isConfig => {
		if (isConfig) {   //保存配置
			browser.storage.local.set({config: myNewTabWE.config}).then(null, e => {
				myNewTabWE.notify(e, '设置readLater配置失败');
			});
		} else {   //保存网址列表
			browser.storage.local.set({sites: myNewTabWE.sites}).then(null, e => {
				myNewTabWE.notify(e, '设置readLater配置失败');
			});
		}
	},
	
	//初始化导入导出功能
	initImportExport: () => {
		let upload = $id('upload');
		$id('import').addEventListener('click', () => {
			upload.setAttribute('accept', 'application/json');
			upload.onchange = () => {
				let reader = new FileReader();
				reader.onload = () => {
					let storage;
					try {
						storage = JSON.parse(reader.result);
					} catch(e) {
						myNewTabWE.notify(e, '导入myNewTabWE配置失败');
						return;
					}
					browser.storage.local.set(storage).then(() => {
						location.reload();   //刷新网页
					}, e => {
						myNewTabWE.notify(e, '设置myNewTabWE配置失败');
					});
				};
				reader.readAsText(upload.files[0]);
			};
			upload.click();
		}, false);
		$id('export').addEventListener('click', () => {
			let download = document.createElement('a');
			download.setAttribute('download', 'myNewTabWE.json');
			let storage = {
				config: myNewTabWE.config,
				imageData: myNewTabWE.imageData,
				sites: myNewTabWE.sites
			};
			download.setAttribute('href', URL.createObjectURL(new Blob([JSON.stringify(storage, null, '\t')])));
			download.dispatchEvent(new MouseEvent('click'));
		}, false);
	},
	//初始化选项
	initConf: () => {
		$id('newtab-open').checked = myNewTabWE.config.newTabOpen;
		$id('bing-max-history').value = myNewTabWE.config.bingMaxHistory;
		if (myNewTabWE.config.useBigImage) {
			$id('1920').checked = true;
		} else {
			$id('1366').checked = true;
		}
		$id('title').value = myNewTabWE.config.title;
		$id('weather-src').value = myNewTabWE.config.weatherSrc;
		myNewTabWE.confListener();
	},
	//初始化导航网址
	initSites: ()=> {
		for (let group of myNewTabWE.sites) {
			$id('sites').appendChild(myNewTabWE.buildGroup(group));
		}
		$id('new-group').addEventListener('click', () => {
			let name = prompt('请输入分组名');
			if (name != null) {
				let group = {
					name: name,
					list: []
				};
				myNewTabWE.sites.push(group);
				myNewTabWE.setStorage();
				let node = myNewTabWE.buildGroup(group);
				$id('sites').appendChild(node);
				node.scrollIntoView(false);   //与滚动区的可视区域的底端对齐
			}
		}, false);
	},
	//初始化编辑界面
	initEdit: () => {
		let upload = $id('upload');
		$id('edit-upload').addEventListener('click', () => {
			upload.setAttribute('accept', 'image/*');
			upload.onchange = () => {
				let reader = new FileReader();
				reader.onload = () => {
					$id('edit-icon').value = reader.result;
				};
				reader.readAsDataURL(upload.files[0]);
			};
			upload.click();
		}, false);
		let count = 0;   //用来判断获取到的图标时的模态框是否还是原来的
		$id('edit-modal').setAttribute('count', count);
		$id('edit-geticon').addEventListener('click', () => {
			let iconUrl = /^https?:\/\/[^\/]+/i.exec($id('edit-url').value);   //获取host
			if (iconUrl) {
				$id('edit-geticon').textContent = '正在获取';
				count = parseInt($id('edit-modal').getAttribute('count'));
				iconUrl += '/favicon.ico';
				let xhr = new XMLHttpRequest();
				xhr.responseType = 'document';
				xhr.open('GET', $id('edit-url').value, true);
				xhr.onload = () => {
					if (xhr.status == 200) {
						let icon = xhr.response.querySelector('link[rel~=icon]');
						if (icon && icon.href) {
							iconUrl = icon.href;
						} else {
							console.log($id('edit-url').value + ' 没有指定图标，尝试获取favicon.ico');
						}
					} else {
						console.log(new Error(xhr.statusText));
					}
					//获取图标
					xhr = new XMLHttpRequest();
					xhr.responseType = 'blob';
					xhr.open('GET', iconUrl, true);
					xhr.onload = () => {
						if (xhr.status == 200) {
							let reader = new FileReader();
							reader.onload = () => {
								if (count == parseInt($id('edit-modal').getAttribute('count'))) {
									$id('edit-icon').value = reader.result;
								}
							};
							reader.readAsDataURL(xhr.response);
						} else {
							myNewTabWE.notify(new Error(xhr.statusText), '获取图标失败');
						}
						$id('edit-geticon').textContent = '自动获取';
					};
					xhr.send(null);
				};
				xhr.send(null);
			} else {
				myNewTabWE.notify($id('edit-url').value, '不是标准http网址');
			}
		}, false);
	},
	
	init: () => {
		myNewTabWE.initImportExport();
		myNewTabWE.initConf();
		myNewTabWE.initSites();
		myNewTabWE.initEdit();
	},
	
	//选项变更时保存
	confListener: () => {
		$id('newtab-open').addEventListener('click', e => {
			myNewTabWE.config.newTabOpen = e.target.checked;
			myNewTabWE.setStorage(true);
		});
		$id('bing-max-history').addEventListener('change', e => {
			myNewTabWE.config.bingMaxHistory = e.target.value;
			myNewTabWE.setStorage(true);
		});
		$id('1920').addEventListener('click', () => {
			myNewTabWE.config.useBigImage = true;
			myNewTabWE.setStorage(true);
		});
		$id('1366').addEventListener('click', () => {
			myNewTabWE.config.useBigImage = false;
			myNewTabWE.setStorage(true);
		});
		$id('title').addEventListener('change', e => {
			myNewTabWE.config.title = e.target.value;
			myNewTabWE.setStorage(true);
		});
		$id('weather-src').addEventListener('change', e => {
			myNewTabWE.config.weatherSrc = e.target.value;
			myNewTabWE.setStorage(true);
		});
	},
	buildGroup: group => {
		let node = $id('template-group').cloneNode(true);
		node.removeAttribute('id');
		node.removeAttribute('hidden');
		let table = node.querySelector('.group-table'),
			row = node.querySelector('.template-row');
		
		node.querySelector('.group-name').textContent = group.name;
		node.querySelector('.group-add').addEventListener('click', () => {
			let site = {
				title: '',
				url: '',
				icon: ''
			};
			myNewTabWE.editSite(site).then(() => {
				group.list.push(site);
				myNewTabWE.setStorage();
				let node = myNewTabWE.buildTr(site, group.list, row.cloneNode(true));
				table.appendChild(node);
				node.scrollIntoView(false);   //与滚动区的可视区域的底端对齐
			});
		}, false);
		node.querySelector('.group-rename').addEventListener('click', () => {
			let name = prompt('请输入分组名', group.name);
			if (name != null) {
				group.name = name;
				myNewTabWE.setStorage();
				node.querySelector('.group-name').textContent = group.name;
			}
		}, false);
		node.querySelector('.group-delete').addEventListener('click', () => {
			myNewTabWE.sites.splice(myNewTabWE.sites.indexOf(group), 1);
			myNewTabWE.setStorage();
			$id('sites').removeChild(node);
		}, false);
		for (let site of group.list) {
			table.appendChild(myNewTabWE.buildTr(site, group.list, row.cloneNode(true)));
		}
		return node;
	},
	buildTr: (site, list, node) => {
		node.removeAttribute('hidden');
		let title = node.querySelector('.row-title'),
			img = node.querySelector('.row-icon img'),
			url = node.querySelector('.row-url');
		title.textContent = title.title = site.title;
		img.src = img.title = site.icon;
		url.textContent = url.title = site.url;
		node.querySelector('.row-edit').addEventListener('click', () => {
			myNewTabWE.editSite(site).then(() => {
				title.textContent = title.title = site.title;
				img.src = img.title = site.icon;
				url.textContent = url.title = site.url;
				myNewTabWE.setStorage();
			});
		}, false);
		node.querySelector('.row-delete').addEventListener('click', () => {
			list.splice(list.indexOf(site), 1);
			myNewTabWE.setStorage();
			node.parentNode.removeChild(node);
		}, false);
		return node;
	},
	editSite: site => {
		$id('edit-modal').setAttribute('count', parseInt($id('edit-modal').getAttribute('count')) + 1);
		return new Promise((resolve, reject) => {
			$id('edit-title').value = site.title;
			$id('edit-url').value = site.url;
			$id('edit-icon').value = site.icon;
			$id('edit-geticon').textContent = '自动获取';
			$id('edit-confirm').onclick = () => {
				site.title = $id('edit-title').value;
				site.url = $id('edit-url').value;
				site.icon = $id('edit-icon').value;
				$id('edit-modal').style.display = 'none';
				resolve();
			};
			$id('edit-cancel').onclick = () => {
				$id('edit-modal').style.display = 'none';
				reject();
			};
			$id('edit-modal').style.display = 'flex';
			$id('edit-title').focus();
		});
	}
};

myNewTabWE.getStorage().then(() => {myNewTabWE.init()});
