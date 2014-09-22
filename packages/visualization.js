var visualization = {
	customListGetters: {
		range: function(){
			var field = this.params[0], list = this.host.host, self = this;
			if(!field){// show the range of list indices!
				var min = 0;
				var max = list.list.length - 1;
				this.set([min, max]);
				list.onChangeItem('create', function(){
					max++;
					this.set([min, max]);
				}.bind(this))
				list.onChangeItem('delete', function(){
					max--;
					this.set([min, max]);
				}.bind(this))
				return;
			}
			var max = Number.NEGATIVE_INFINITY;
			var min = Number.POSITIVE_INFINITY;
			list.onChangeItemField(field, function(x, y, num){
				var changed = false;
				if(num > max){
					max = num;
					changed = true;
				}
				if(num < min){
					min = num;
					changed = true;
				}
				if(changed){
					self.set([min, max]);
				}
			})
			list.onChangeItem('create', function(x, index){
				var num = list.list[index](field).get();
				var changed = false;
				if(num > max){
					max = num;
					changed = true;
				}
				if(num < min){
					min = num;
					changed = true;
				}
				if(changed){
					self.set([min, max]);
				}
			})
			list.onChangeItem('delete', function(x, index){
				var num = list.list[index](field).get();
				if(num == self.get()[0] || num == self.get()[1]){
					// recount ranges!
					var max = Number.NEGATIVE_INFINITY;
					var min = Number.POSITIVE_INFINITY;
					for(var i in list.list){
						var num = list.list[i](field).get();
						if(num > max){
							max = num;
						}
						if(num < min){
							min = num;
						}
					}
					this.set([min, max]);
				}
			})
			for(var i in list.list){
				var num = list.list[i](field).get();
				if(num > max){
					max = num;
				}
				if(num < min){
					min = num;
				}
			}
			this.set([min, max]);
		}
	},
	cellMacrosMethods: {
		scale: function() {
			var args = Array.prototype.slice.call(arguments);
			args.unshift(function(input_domain, output_range, input_val) {
				return ((input_val - input_domain[0])/(input_domain[1] - input_domain[0]))*(output_range[1] - output_range[0]) + output_range[0];
			});
			return args;
		},
	}
}
Firera.addPackage(visualization);